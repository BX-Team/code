use axum::Json;
use axum::extract::{Query, State};
use axum::http::StatusCode;
use axum::response::Response;
use chrono::{Duration, Utc};
use database::models::auth;
use serde::Deserialize;
use util::{ApiError, ApiResult};
use utoipa::ToSchema;

use super::{establish_session, random_token, safe_destination};
use crate::auth::session::hash_token;
use crate::state::AppState;

const LINK_MINUTES: i64 = 15;

#[derive(Debug, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct SendLink {
    pub email: String,
    pub callback_url: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct Verify {
    pub token: String,
}

/// Emails a one-time sign-in link. Answers the same way whether or not the address is known,
/// so the endpoint cannot be used to enumerate accounts.
#[utoipa::path(post, path = "/auth/sign-in/magic-link", tag = "auth",
    request_body = SendLink,
    responses((status = 204), (status = 400)))]
pub async fn send(
    State(state): State<AppState>,
    Json(body): Json<SendLink>,
) -> ApiResult<StatusCode> {
    let email = body.email.trim().to_lowercase();
    if !looks_like_email(&email) {
        return Err(ApiError::BadRequest("Enter a valid email address".into()));
    }

    let destination = safe_destination(body.callback_url.as_deref(), &state.config.app_url);
    let token = random_token()?;

    // The destination travels in the stored identifier, not in the emailed URL, so it cannot be
    // rewritten between the click and the redirect.
    auth::create_verification(
        &state.db,
        &format!("{email}\u{1f}{destination}"),
        &hash_token(&token),
        Utc::now() + Duration::minutes(LINK_MINUTES),
    )
    .await?;

    let link = format!(
        "{}/auth/magic-link/verify?token={token}",
        state.config.api_public_url.trim_end_matches('/')
    );

    state
        .mailer
        .send_magic_link(&email, &link)
        .await
        .map_err(|error| {
            // Deliverability is availability of sign-in: never report this as success.
            tracing::error!(%error, "could not send a magic link");
            ApiError::ServiceUnavailable("Could not send the sign-in email".into())
        })?;

    Ok(StatusCode::NO_CONTENT)
}

#[utoipa::path(get, path = "/auth/magic-link/verify", tag = "auth",
    params(("token" = String, Query, description = "One-time token from the email")),
    responses((status = 303), (status = 401)))]
pub async fn verify(
    State(state): State<AppState>,
    Query(query): Query<Verify>,
) -> ApiResult<Response> {
    let identifier = auth::consume_verification(&state.db, &hash_token(&query.token))
        .await?
        .ok_or_else(|| {
            ApiError::Unauthorized("This sign-in link has expired or was used".into())
        })?;

    let (email, destination) = identifier
        .split_once('\u{1f}')
        .ok_or_else(|| ApiError::internal("malformed verification identifier"))?;

    let user = match auth::user_by_email(&state.db, email).await? {
        Some(user) => user,
        // Clicking a link proves the address, so a first sign-in is also the sign-up.
        None => auth::create_user(&state.db, default_name(email), email, true, None).await?,
    };

    if user.is_banned(Utc::now()) {
        return Err(ApiError::Forbidden(
            user.ban_reason.unwrap_or_else(|| "Account banned".into()),
        ));
    }

    establish_session(&state, user.id, destination).await
}

fn default_name(email: &str) -> &str {
    email.split('@').next().unwrap_or(email)
}

fn looks_like_email(value: &str) -> bool {
    let Some((local, domain)) = value.split_once('@') else {
        return false;
    };

    !local.is_empty()
        && value.len() <= 254
        && domain.contains('.')
        && !domain.starts_with('.')
        && !domain.ends_with('.')
        && !value.contains(char::is_whitespace)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn obvious_nonsense_is_rejected_before_an_email_is_queued() {
        assert!(looks_like_email("user@example.com"));
        assert!(looks_like_email("first.last+tag@sub.example.co.uk"));

        assert!(!looks_like_email(""));
        assert!(!looks_like_email("user"));
        assert!(!looks_like_email("@example.com"));
        assert!(!looks_like_email("user@example"));
        assert!(!looks_like_email("user@.com"));
        assert!(!looks_like_email("user@example."));
        assert!(!looks_like_email("user name@example.com"));
    }

    #[test]
    fn the_default_display_name_is_the_local_part() {
        assert_eq!(default_name("nonplay@example.com"), "nonplay");
        assert_eq!(default_name("weird"), "weird");
    }
}
