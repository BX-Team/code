use std::time::Duration;

use database::queue::{self, QueuedEvent};
use sqlx::Acquire;
use types::ingest::IngestEvent;

use crate::alerts::{AlertPayload, Project, deliver};
use crate::handlers::{Outcome, PendingAlert, dispatch};
use crate::state::AppState;
use crate::{Error, truncate};

pub async fn run(state: AppState) {
    let idle = Duration::from_millis(state.config.idle_sleep_ms);

    loop {
        match drain(&state).await {
            Ok(0) => tokio::time::sleep(idle).await,
            Ok(count) => tracing::debug!(count, "batch handled"),
            Err(error) => {
                tracing::error!(%error, "batch failed");
                tokio::time::sleep(idle).await;
            }
        }
    }
}

/// Claims one batch, applies it, and only then does anything the transaction cannot undo.
pub async fn drain(state: &AppState) -> Result<usize, Error> {
    let mut tx = state.db.begin().await?;
    let messages = queue::claim(&mut tx, state.config.batch_size).await?;

    if messages.is_empty() {
        tx.rollback().await?;
        return Ok(0);
    }

    let mut outcome = Outcome::default();
    let mut done = Vec::with_capacity(messages.len());
    let mut failed = Vec::new();

    for message in &messages {
        match apply(state, &mut tx, message, &mut outcome).await {
            Ok(()) => done.push(message.id),
            Err(reason) => failed.push((message, reason)),
        }
    }

    // ClickHouse and object storage are not part of the transaction. Writing them first makes
    // redelivery duplicate a row at worst; committing first would lose it outright.
    state.analytics.write(&outcome.analytics).await?;
    store_payloads(state, &outcome).await;

    queue::complete(&mut tx, &done).await?;
    tx.commit().await?;

    for (message, reason) in failed {
        if let Err(error) = queue::fail(&state.db, message, &reason).await {
            tracing::error!(%error, "could not reschedule a failed message");
        }
    }

    notify(state, &outcome.alerts).await;
    Ok(messages.len())
}

/// Applies one message inside its own savepoint, so a poisoned event cannot roll back its batch.
async fn apply(
    state: &AppState,
    tx: &mut database::Transaction<'_>,
    message: &QueuedEvent,
    outcome: &mut Outcome,
) -> Result<(), String> {
    let event = match serde_json::from_value::<IngestEvent>(message.payload.clone()) {
        Ok(event) => event,
        Err(error) => {
            // An unparsable event is dead-lettered rather than dropped: bad payloads have to
            // stay visible, otherwise a broken SDK release looks like silence.
            let reason = format!("invalid event: {error}");
            tracing::warn!(project_id = %message.project_id, reason, "dead-lettering event");
            if let Err(error) = queue::dead_letter(tx, message, &reason).await {
                tracing::error!(%error, "could not dead-letter an invalid event");
            }
            return Ok(());
        }
    };

    let mut savepoint = tx.begin().await.map_err(|error| error.to_string())?;

    match dispatch(state, &mut savepoint, message, &event, outcome).await {
        Ok(()) => savepoint.commit().await.map_err(|error| error.to_string()),
        Err(error) => {
            let _ = savepoint.rollback().await;
            Err(error.to_string())
        }
    }
}

async fn store_payloads(state: &AppState, outcome: &Outcome) {
    for stored in &outcome.payloads {
        if let Err(error) = state
            .storage
            .put_error_payload(
                stored.project_id,
                &stored.fingerprint,
                stored.at,
                &stored.payload,
            )
            .await
        {
            tracing::error!(%error, fingerprint = stored.fingerprint, "could not store payload");
        }
    }
}

/// Runs after the commit: webhooks are external calls and must never hold a transaction open.
async fn notify(state: &AppState, alerts: &[PendingAlert]) {
    for alert in alerts {
        let rules = match database::models::pulsify::matching_alert_rules(
            &state.db,
            alert.project_id,
            alert.kind,
        )
        .await
        {
            Ok(rules) if !rules.is_empty() => rules,
            Ok(_) => continue,
            Err(error) => {
                tracing::error!(%error, "could not load alert rules");
                continue;
            }
        };

        let Ok(Some(project)) =
            database::models::pulsify::project(&state.db, alert.project_id).await
        else {
            continue;
        };

        let mut payload = AlertPayload::new(
            alert.kind,
            Project {
                name: project.name,
                slug: project.slug,
            },
            truncate(&alert.message, 2000),
            &state.config.app_url,
        );
        payload.plugin = Some(alert.plugin.clone());
        payload.level = Some(alert.level.clone());
        payload.version = alert.version.clone();

        for rule in rules {
            deliver(&state.http, &rule.webhook_url, &payload).await;
        }
    }
}
