use axum::extract::{Path, Query, State};
use axum::response::{IntoResponse, Redirect, Response};
use chrono::{Duration, Utc};
use database::models::auth;
use serde::Deserialize;
use util::{ApiError, ApiResult};

use super::{establish_session, random_token, safe_destination};
use crate::auth::oauth::Provider;
use crate::auth::session::hash_token;
use crate::state::AppState;

const STATE_MINUTES: i64 = 10;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StartQuery {
    pub callback_url: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CallbackQuery {
    pub code: Option<String>,
    pub state: Option<String>,
    pub error: Option<String>,
}

#[utoipa::path(get, path = "/auth/sign-in/{provider}", tag = "auth",
    params(("provider" = String, Path, description = "github or discord")),
    responses((status = 303), (status = 400)))]
pub async fn start(
    State(state): State<AppState>,
    Path(provider): Path<String>,
    Query(query): Query<StartQuery>,
) -> ApiResult<Response> {
    let provider =
        Provider::parse(&provider).ok_or_else(|| ApiError::NotFound("Unknown provider".into()))?;

    let destination = safe_destination(query.callback_url.as_deref(), &state.config.app_url);
    let token = random_token()?;

    // The state is a one-time verification row, so a replayed or forged callback finds nothing
    // to consume. The destination rides along with it rather than in the URL.
    auth::create_verification(
        &state.db,
        &format!("{}\u{1f}{destination}", provider.as_str()),
        &hash_token(&token),
        Utc::now() + Duration::minutes(STATE_MINUTES),
    )
    .await?;

    let url = provider.authorize_url(&state.config, &token)?;
    Ok(Redirect::to(&url).into_response())
}

#[utoipa::path(get, path = "/auth/callback/{provider}", tag = "auth",
    params(("provider" = String, Path, description = "github or discord")),
    responses((status = 303), (status = 401)))]
pub async fn callback(
    State(state): State<AppState>,
    Path(provider): Path<String>,
    Query(query): Query<CallbackQuery>,
) -> ApiResult<Response> {
    let provider =
        Provider::parse(&provider).ok_or_else(|| ApiError::NotFound("Unknown provider".into()))?;

    if let Some(error) = query.error {
        return Err(ApiError::Unauthorized(format!(
            "Sign-in was refused: {error}"
        )));
    }

    let (Some(code), Some(returned_state)) = (query.code, query.state) else {
        return Err(ApiError::BadRequest("Missing code or state".into()));
    };

    let identifier = auth::consume_verification(&state.db, &hash_token(&returned_state))
        .await?
        .ok_or_else(|| ApiError::Unauthorized("This sign-in attempt has expired".into()))?;

    let (issued_for, destination) = identifier
        .split_once('\u{1f}')
        .ok_or_else(|| ApiError::internal("malformed oauth state"))?;

    if issued_for != provider.as_str() {
        return Err(ApiError::Unauthorized(
            "Sign-in state does not match".into(),
        ));
    }

    let identity = provider.identity(&state.config, &state.http, &code).await?;
    let email = identity.email.trim().to_lowercase();

    let user = match auth::account(&state.db, provider.as_str(), &identity.account_id).await? {
        Some(account) => auth::user(&state.db, account.user_id)
            .await?
            .ok_or_else(|| ApiError::internal("account without a user"))?,
        // The provider vouched for the address, so an existing local account is the same person.
        None => match auth::user_by_email(&state.db, &email).await? {
            Some(user) => user,
            None => {
                auth::create_user(
                    &state.db,
                    &identity.name,
                    &email,
                    true,
                    identity.image.as_deref(),
                )
                .await?
            }
        },
    };

    if user.is_banned(Utc::now()) {
        return Err(ApiError::Forbidden(
            user.ban_reason.unwrap_or_else(|| "Account banned".into()),
        ));
    }

    auth::link_account(
        &state.db,
        user.id,
        provider.as_str(),
        &identity.account_id,
        None,
        None,
    )
    .await?;

    establish_session(&state, user.id, destination).await
}
