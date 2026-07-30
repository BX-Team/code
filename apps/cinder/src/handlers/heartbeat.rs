use analytics::writer::ServerStatsPoint;
use database::Transaction;
use database::models::pulsify;
use database::queue::QueuedEvent;
use sqlx::Acquire;
use types::ingest::Heartbeat;

use super::Outcome;
use crate::Error;
use crate::state::AppState;

pub async fn handle(
    state: &AppState,
    tx: &mut Transaction<'_>,
    message: &QueuedEvent,
    heartbeat: &Heartbeat,
    outcome: &mut Outcome,
) -> Result<(), Error> {
    let country = state.country_of(message.ip.as_deref());

    pulsify::upsert_server_metadata(
        tx,
        message.project_id,
        &heartbeat.server.software,
        &heartbeat.server.version,
        &country,
    )
    .await?;

    outcome.analytics.server_stats.push(ServerStatsPoint {
        timestamp: message.received_at,
        project_id: message.project_id,
        online: u32::try_from(heartbeat.server.online.max(0)).unwrap_or(u32::MAX),
        tps: heartbeat.server.tps,
        mspt: heartbeat.server.mspt,
        memory_used_mb: u64::try_from(heartbeat.server.memory_used_mb.max(0)).unwrap_or(0),
        memory_max_mb: u64::try_from(heartbeat.server.memory_max_mb.max(0)).unwrap_or(0),
    });

    record_installations(tx, message, heartbeat).await;
    Ok(())
}

/// Installation matching runs in its own savepoint: a plugin name clash must not cost the
/// heartbeat that carried it.
async fn record_installations(
    tx: &mut Transaction<'_>,
    message: &QueuedEvent,
    heartbeat: &Heartbeat,
) {
    if heartbeat.plugins.is_empty() {
        return;
    }

    let mut names = Vec::with_capacity(heartbeat.plugins.len());
    let mut versions = Vec::with_capacity(heartbeat.plugins.len());
    let mut enabled = Vec::with_capacity(heartbeat.plugins.len());
    for plugin in &heartbeat.plugins {
        names.push(plugin.name.clone());
        versions.push(plugin.version.clone());
        enabled.push(plugin.enabled);
    }

    let savepoint = match tx.begin().await {
        Ok(savepoint) => savepoint,
        Err(error) => {
            tracing::warn!(%error, "could not open a savepoint for installations");
            return;
        }
    };
    let mut savepoint = savepoint;

    match pulsify::upsert_installations(
        &mut savepoint,
        message.project_id,
        &names,
        &versions,
        &enabled,
    )
    .await
    {
        Ok(_) => {
            if let Err(error) = savepoint.commit().await {
                tracing::warn!(%error, "could not record plugin installations");
            }
        }
        Err(error) => {
            tracing::warn!(%error, project_id = %message.project_id, "plugin matching failed");
            let _ = savepoint.rollback().await;
        }
    }
}
