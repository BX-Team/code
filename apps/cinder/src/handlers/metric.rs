use analytics::writer::MetricPoint;
use database::queue::QueuedEvent;
use types::ingest::MetricEvent;

use super::Outcome;

pub fn handle(message: &QueuedEvent, event: &MetricEvent, outcome: &mut Outcome) {
    outcome.analytics.metrics.push(MetricPoint {
        timestamp: message.received_at,
        project_id: message.project_id,
        name: event.name.clone(),
        labels: event.labels.clone(),
        value: event.value,
    });
}
