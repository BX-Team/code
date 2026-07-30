use analytics::writer::{Batch, EventPoint};
use chrono::{DateTime, Utc};
use database::Transaction;
use database::queue::QueuedEvent;
use storage::error_payloads::ErrorPayload;
use types::ingest::IngestEvent;
use uuid::Uuid;

use crate::state::AppState;
use crate::{Error, truncate};

pub mod error;
pub mod heartbeat;
pub mod metric;
pub mod player;

/// Everything one drained batch produced that must not happen inside the transaction:
/// analytics rows, object writes and webhook deliveries.
#[derive(Default)]
pub struct Outcome {
    pub analytics: Batch,
    pub payloads: Vec<StoredPayload>,
    pub alerts: Vec<PendingAlert>,
}

pub struct StoredPayload {
    pub project_id: Uuid,
    pub fingerprint: String,
    pub at: DateTime<Utc>,
    pub payload: ErrorPayload,
}

pub struct PendingAlert {
    pub project_id: Uuid,
    pub kind: &'static str,
    pub plugin: String,
    pub level: String,
    pub version: Option<String>,
    pub message: String,
}

pub async fn dispatch(
    state: &AppState,
    tx: &mut Transaction<'_>,
    message: &QueuedEvent,
    event: &IngestEvent,
    outcome: &mut Outcome,
) -> Result<(), Error> {
    outcome.analytics.events.push(EventPoint {
        timestamp: message.received_at,
        project_id: message.project_id,
        kind: event.kind().to_owned(),
        payload: truncate(&message.payload.to_string(), 5000),
    });

    match event {
        IngestEvent::Heartbeat(heartbeat) => {
            heartbeat::handle(state, tx, message, heartbeat, outcome).await
        }
        IngestEvent::Event(player) => player::handle(state, tx, message, player, outcome).await,
        IngestEvent::Error(error) => error::handle(tx, message, error, outcome).await,
        IngestEvent::Metric(metric) => {
            metric::handle(message, metric, outcome);
            Ok(())
        }
    }
}
