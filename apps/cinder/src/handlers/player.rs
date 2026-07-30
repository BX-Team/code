use analytics::writer::SessionPoint;
use database::Transaction;
use database::models::pulsify;
use database::queue::QueuedEvent;
use types::ingest::{PlayerAction, PlayerEvent};

use super::Outcome;
use crate::Error;
use crate::state::AppState;

pub async fn handle(
    state: &AppState,
    tx: &mut Transaction<'_>,
    message: &QueuedEvent,
    event: &PlayerEvent,
    outcome: &mut Outcome,
) -> Result<(), Error> {
    match event.event {
        PlayerAction::PlayerJoin => {
            let country = state.country_of(event.payload.player_ip.as_deref());

            pulsify::open_session(
                tx,
                message.project_id,
                event.payload.player_uuid,
                event.payload.client_version.as_deref().unwrap_or_default(),
                &country,
            )
            .await?;
        }
        PlayerAction::PlayerQuit => {
            let session =
                pulsify::close_session(tx, message.project_id, event.payload.player_uuid).await?;

            // A quit without a matching join carries no duration worth recording.
            if let Some(session) = session {
                // Both ends come from server clocks: the SDK's timestamp is untrusted input and
                // would otherwise let a server dictate its own session lengths.
                let duration = (message.received_at - session.joined_at)
                    .num_seconds()
                    .max(0);

                outcome.analytics.sessions.push(SessionPoint {
                    timestamp: message.received_at,
                    project_id: message.project_id,
                    player_uuid: session.player_uuid,
                    client_version: session.client_version,
                    country_code: session.country_code,
                    abandoned: 0,
                    duration_seconds: u32::try_from(duration).unwrap_or(u32::MAX),
                });
            }
        }
    }

    Ok(())
}
