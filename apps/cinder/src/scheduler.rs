use std::time::Duration;

use analytics::writer::{Batch, SessionPoint};
use chrono::Utc;
use database::models::{auth, pulsify};

use crate::alerts::spikes;
use crate::state::AppState;

const SESSION_TIMEOUT_HOURS: i32 = 24;

pub async fn run(state: AppState) {
    let mut spike_timer = tokio::time::interval(Duration::from_secs(60));
    let mut sweep_timer = tokio::time::interval(Duration::from_secs(15 * 60));
    let mut retention_timer = tokio::time::interval(Duration::from_secs(6 * 60 * 60));

    loop {
        tokio::select! {
            _ = spike_timer.tick() => spikes::evaluate(&state).await,
            _ = sweep_timer.tick() => sweep_sessions(&state).await,
            _ = retention_timer.tick() => enforce_retention(&state).await,
        }
    }
}

/// Records sessions that never got a quit as abandoned. They must not vanish silently, and a
/// half-open session must never reach the analytics store.
async fn sweep_sessions(state: &AppState) {
    let mut tx = match state.db.begin().await {
        Ok(tx) => tx,
        Err(error) => {
            tracing::error!(%error, "could not start the session sweep");
            return;
        }
    };

    let stale = match pulsify::sweep_open_sessions(&mut tx, SESSION_TIMEOUT_HOURS).await {
        Ok(stale) => stale,
        Err(error) => {
            tracing::error!(%error, "session sweep failed");
            return;
        }
    };

    if stale.is_empty() {
        let _ = tx.rollback().await;
        return;
    }

    let now = Utc::now();
    let mut batch = Batch::default();
    for session in stale {
        let duration = (now - session.joined_at).num_seconds().max(0);
        batch.sessions.push(SessionPoint {
            timestamp: now,
            project_id: session.project_id,
            player_uuid: session.player_uuid,
            client_version: session.client_version,
            country_code: session.country_code,
            abandoned: 1,
            duration_seconds: u32::try_from(duration).unwrap_or(u32::MAX),
        });
    }

    let swept = batch.sessions.len();
    if let Err(error) = state.analytics.write(&batch).await {
        tracing::error!(%error, "could not record abandoned sessions");
        let _ = tx.rollback().await;
        return;
    }

    if let Err(error) = tx.commit().await {
        tracing::error!(%error, "could not commit the session sweep");
        return;
    }

    tracing::info!(swept, "closed abandoned sessions");
}

/// Drops the rows nothing reads any more; none of these tables used to have a bound.
async fn enforce_retention(state: &AppState) {
    match pulsify::prune_daily_usage(&state.db, state.config.usage_retention_days).await {
        Ok(rows) if rows > 0 => tracing::info!(rows, "pruned daily usage counters"),
        Ok(_) => {}
        Err(error) => tracing::error!(%error, "could not prune daily usage"),
    }

    match auth::prune_sessions(&state.db).await {
        Ok(rows) if rows > 0 => tracing::info!(rows, "pruned expired sessions"),
        Ok(_) => {}
        Err(error) => tracing::error!(%error, "could not prune sessions"),
    }

    match auth::prune_verifications(&state.db).await {
        Ok(rows) if rows > 0 => tracing::info!(rows, "pruned expired verifications"),
        Ok(_) => {}
        Err(error) => tracing::error!(%error, "could not prune verifications"),
    }
}
