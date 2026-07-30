use analytics::writer::ErrorPoint;
use database::Transaction;
use database::models::pulsify::{self, IssueTransition};
use database::queue::QueuedEvent;
use storage::error_payloads::ErrorPayload;
use types::ingest::ErrorEvent;
use types::scrub::{compute_fingerprint, scrub};

use super::{Outcome, PendingAlert, StoredPayload};
use crate::{Error, truncate};

pub async fn handle(
    tx: &mut Transaction<'_>,
    message: &QueuedEvent,
    event: &ErrorEvent,
    outcome: &mut Outcome,
) -> Result<(), Error> {
    // Scrubbing happens before anything is written, so personal data never reaches storage.
    let text = scrub(&event.error.message);
    let stacktrace = scrub(&event.error.stacktrace);
    let level = event.error.level.as_str();

    // Computed once here and shared by the analytics row, the stored payload and the issue
    // registry — the three can never disagree about which errors belong together.
    let fingerprint = compute_fingerprint(&event.plugin, &text, level, &stacktrace);

    let server_version = event.error.server_version.clone().unwrap_or_default();
    let server_software = event.error.server_software.clone().unwrap_or_default();
    let plugin_version = event.error.plugin_version.clone().unwrap_or_default();

    outcome.analytics.errors.push(ErrorPoint {
        timestamp: message.received_at,
        project_id: message.project_id,
        fingerprint: fingerprint.clone(),
        plugin: event.plugin.clone(),
        level: level.to_owned(),
        server_version: server_version.clone(),
        server_software: server_software.clone(),
        plugin_version: plugin_version.clone(),
        message: truncate(&text, 1000),
    });

    outcome.payloads.push(StoredPayload {
        project_id: message.project_id,
        fingerprint: fingerprint.clone(),
        at: message.received_at,
        payload: ErrorPayload {
            plugin: event.plugin.clone(),
            message: text.clone(),
            stacktrace,
            level: level.to_owned(),
            server_version: server_version.clone(),
            server_software,
            plugin_version: plugin_version.clone(),
            timestamp: event.timestamp,
        },
    });

    let version = event.error.plugin_version.as_deref();
    let transition =
        pulsify::record_issue(tx, message.project_id, &fingerprint, &event.plugin, version).await?;

    let kind = match transition {
        IssueTransition::NewIssue => Some("new_issue"),
        IssueTransition::Regression => Some("regression"),
        IssueTransition::None => None,
    };

    if let Some(kind) = kind {
        outcome.alerts.push(PendingAlert {
            project_id: message.project_id,
            kind,
            plugin: event.plugin.clone(),
            level: level.to_owned(),
            version: event.error.plugin_version.clone(),
            message: text,
        });
    }

    Ok(())
}
