use database::models::pulsify;

use super::{AlertPayload, Project, deliver};
use crate::state::AppState;

/// Evaluates every due `error_spike` rule. Volume thresholds cannot be judged from a single
/// event, so this runs on a timer rather than in the consumer.
pub async fn evaluate(state: &AppState) {
    let rules = match pulsify::due_spike_rules(&state.db).await {
        Ok(rules) => rules,
        Err(error) => {
            tracing::error!(%error, "could not load spike rules");
            return;
        }
    };

    for rule in rules {
        let count = match state
            .analytics
            .error_count_in_window(rule.project_id, rule.window_minutes)
            .await
        {
            Ok(count) => count,
            Err(error) => {
                tracing::error!(%error, project_id = %rule.project_id, "spike query failed");
                continue;
            }
        };

        if count < rule.threshold as u64 {
            continue;
        }

        let Ok(Some(project)) = pulsify::project(&state.db, rule.project_id).await else {
            continue;
        };

        let mut payload = AlertPayload::new(
            "error_spike",
            Project {
                name: project.name,
                slug: project.slug,
            },
            format!("{count} errors in the last {} minutes", rule.window_minutes),
            &state.config.app_url,
        );
        payload.count = Some(count);
        payload.window_minutes = Some(rule.window_minutes);

        deliver(&state.http, &rule.webhook_url, &payload).await;

        if let Err(error) = pulsify::mark_alert_fired(&state.db, rule.id).await {
            tracing::error!(%error, "could not record the alert firing");
        }
    }
}
