use axum::Json;
use axum::extract::State;
use axum::http::StatusCode;
use chrono::{Duration, NaiveTime, Utc};
use serde::Serialize;
use types::ingest::RawBatch;
use util::{ApiError, ApiResult};

use crate::auth::DsnAuth;
use crate::state::AppState;

#[derive(Debug, Serialize)]
pub struct Accepted {
    pub accepted: usize,
}

#[derive(Debug, Serialize)]
pub struct Pong {
    pub ok: bool,
}

/// Connectivity probe. The SDK treats anything but exactly `200` as "ingest is down".
pub async fn ping(_auth: DsnAuth) -> Json<Pong> {
    Json(Pong { ok: true })
}

/// Accepts a batch and queues it. Events are not validated here — only counted.
pub async fn ingest(
    State(state): State<AppState>,
    auth: DsnAuth,
    body: Result<Json<RawBatch>, axum::extract::rejection::JsonRejection>,
) -> ApiResult<(StatusCode, Json<Accepted>)> {
    let Json(batch) = body.map_err(|error| match error {
        axum::extract::rejection::JsonRejection::BytesRejection(_) => {
            ApiError::PayloadTooLarge("Request body is too large".into())
        }
        _ => ApiError::BadRequest("Request body must be a JSON event or array of events".into()),
    })?;

    let events = batch.into_vec();
    if events.is_empty() {
        return Err(ApiError::BadRequest("Batch is empty".into()));
    }

    let quota = state.daily_quota(auth.project_id).await?;
    let today = Utc::now().date_naive();
    let used = database::models::pulsify::consume_daily_usage(
        &state.db,
        &auth.token,
        today,
        events.len() as i64,
    )
    .await?;

    if used > quota {
        return Err(ApiError::TooManyRequests {
            retry_after: seconds_until_utc_midnight(),
            message: "Daily event quota exceeded".into(),
        });
    }

    let queued = database::queue::enqueue(
        &state.db,
        auth.project_id,
        &events,
        Utc::now(),
        auth.ip.as_deref(),
    )
    .await?;

    Ok((
        StatusCode::ACCEPTED,
        Json(Accepted {
            accepted: queued as usize,
        }),
    ))
}

/// Quota windows are UTC days, so this is how long the client must wait for a fresh one.
fn seconds_until_utc_midnight() -> u64 {
    let now = Utc::now();
    let midnight = (now + Duration::days(1))
        .date_naive()
        .and_time(NaiveTime::MIN)
        .and_utc();

    (midnight - now).num_seconds().max(1) as u64
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_quota_window_never_asks_for_a_zero_second_wait() {
        let wait = seconds_until_utc_midnight();
        assert!((1..=86_400).contains(&wait), "{wait}");
    }
}
