use axum::Json;
use axum::response::{IntoResponse, Redirect, Response};
use chrono::{Duration, Utc};
use database::models::auth::User;
use rand::TryRng;
use serde::Serialize;
use util::{ApiError, ApiResult};
use utoipa::ToSchema;

use crate::auth::cookie;
use crate::auth::session::{Session, hash_token};
use crate::state::AppState;

pub mod admin;
pub mod magic_link;
pub mod oauth;

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct SessionUser {
    pub id: uuid::Uuid,
    pub name: String,
    pub email: String,
    pub email_verified: bool,
    pub image: Option<String>,
    pub role: Option<String>,
    pub banned: bool,
    pub ban_reason: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct SessionResponse {
    pub user: SessionUser,
}

pub fn present(user: User) -> SessionUser {
    SessionUser {
        id: user.id,
        name: user.name,
        email: user.email,
        email_verified: user.email_verified,
        image: user.image,
        role: user.role,
        banned: user.banned,
        ban_reason: user.ban_reason,
        created_at: crate::models::pulsify::iso(user.created_at),
    }
}

#[utoipa::path(get, path = "/auth/me", tag = "auth",
    responses((status = 200, body = SessionResponse), (status = 401)))]
pub async fn me(session: Session) -> Json<SessionResponse> {
    Json(SessionResponse {
        user: present(session.user),
    })
}

/// Unlike `/auth/me` this answers `200` with a null user when nobody is signed in: route
/// middleware asks it on every navigation and an error there is not exceptional.
#[utoipa::path(get, path = "/auth/session", tag = "auth",
    responses((status = 200, body = Option<SessionResponse>)))]
pub async fn get_session(session: Option<Session>) -> Json<Option<SessionResponse>> {
    Json(session.map(|session| SessionResponse {
        user: present(session.user),
    }))
}

#[utoipa::path(post, path = "/auth/sign-out", tag = "auth", responses((status = 204)))]
pub async fn sign_out(
    axum::extract::State(state): axum::extract::State<AppState>,
    jar: RawCookie,
) -> ApiResult<Response> {
    if let Some(token) = jar.0 {
        database::models::auth::delete_session(&state.db, &hash_token(&token)).await?;
    }

    let mut response = axum::http::StatusCode::NO_CONTENT.into_response();
    cookie::clear(&mut response, &state.config.cookie_domain);
    Ok(response)
}

#[derive(Debug, serde::Deserialize, ToSchema)]
pub struct UpdateUser {
    pub name: String,
}

#[utoipa::path(post, path = "/auth/update-user", tag = "auth",
    request_body = UpdateUser,
    responses((status = 200, body = SessionResponse), (status = 401)))]
pub async fn update_user(
    axum::extract::State(state): axum::extract::State<AppState>,
    session: Session,
    Json(body): Json<UpdateUser>,
) -> ApiResult<Json<SessionResponse>> {
    let name = body.name.trim();
    if name.is_empty() || name.chars().count() > 64 {
        return Err(ApiError::BadRequest("name must be 1..64 characters".into()));
    }

    let user = database::models::auth::rename_user(&state.db, session.user.id, name)
        .await?
        .ok_or_else(|| ApiError::NotFound("User not found".into()))?;

    Ok(Json(SessionResponse {
        user: present(user),
    }))
}

/// Deleting the account takes its projects, tokens, issues and quotas with it — through real
/// foreign keys now, not a hand-written cleanup hook.
#[utoipa::path(post, path = "/auth/delete-user", tag = "auth",
    responses((status = 204), (status = 401)))]
pub async fn delete_user(
    axum::extract::State(state): axum::extract::State<AppState>,
    session: Session,
) -> ApiResult<Response> {
    database::models::auth::delete_user(&state.db, session.user.id).await?;

    let mut response = axum::http::StatusCode::NO_CONTENT.into_response();
    cookie::clear(&mut response, &state.config.cookie_domain);
    Ok(response)
}

/// Signs a user in and hands back the redirect that carries the new cookie.
pub async fn establish_session(
    state: &AppState,
    user_id: uuid::Uuid,
    destination: &str,
) -> ApiResult<Response> {
    let token = random_token()?;

    database::models::auth::create_session(
        &state.db,
        user_id,
        &hash_token(&token),
        Utc::now() + Duration::days(cookie::SESSION_DAYS),
        None,
        None,
    )
    .await?;

    let mut response = Redirect::to(destination).into_response();
    cookie::set(&mut response, &token, &state.config.cookie_domain);
    Ok(response)
}

pub fn random_token() -> ApiResult<String> {
    let mut bytes = [0u8; 32];
    rand::rngs::SysRng
        .try_fill_bytes(&mut bytes)
        .map_err(|error| ApiError::internal(error.to_string()))?;
    Ok(hex::encode(bytes))
}

/// The raw session cookie, present or not — sign-out needs the value even when the session
/// behind it is already gone.
pub struct RawCookie(pub Option<String>);

impl axum::extract::FromRequestParts<AppState> for RawCookie {
    type Rejection = std::convert::Infallible;

    async fn from_request_parts(
        parts: &mut axum::http::request::Parts,
        _state: &AppState,
    ) -> Result<Self, Self::Rejection> {
        Ok(Self(crate::auth::session::raw_cookie(parts)))
    }
}

/// Keeps a redirect target on the site itself, so a sign-in link cannot be turned into an
/// open redirect to somebody else's page.
pub fn safe_destination(candidate: Option<&str>, app_url: &str) -> String {
    let fallback = format!("{}/dashboard", app_url.trim_end_matches('/'));

    let Some(candidate) = candidate.map(str::trim).filter(|value| !value.is_empty()) else {
        return fallback;
    };

    if candidate.starts_with('/') && !candidate.starts_with("//") {
        return format!("{}{candidate}", app_url.trim_end_matches('/'));
    }

    let allowed = candidate == app_url.trim_end_matches('/')
        || candidate.starts_with(&format!("{}/", app_url.trim_end_matches('/')));

    if allowed {
        candidate.to_owned()
    } else {
        fallback
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_sign_in_link_cannot_redirect_off_site() {
        let app = "https://bxteam.org";

        assert_eq!(safe_destination(None, app), "https://bxteam.org/dashboard");
        assert_eq!(
            safe_destination(Some(""), app),
            "https://bxteam.org/dashboard"
        );
        assert_eq!(
            safe_destination(Some("/dashboard/settings"), app),
            "https://bxteam.org/dashboard/settings"
        );
        assert_eq!(
            safe_destination(Some("https://bxteam.org/admin"), app),
            "https://bxteam.org/admin"
        );

        for hostile in [
            "https://evil.example/steal",
            "//evil.example/steal",
            "https://bxteam.org.evil.example/steal",
            "javascript:alert(1)",
        ] {
            assert_eq!(
                safe_destination(Some(hostile), app),
                "https://bxteam.org/dashboard",
                "{hostile} was accepted"
            );
        }
    }

    #[test]
    fn tokens_are_unpredictable() {
        let token = random_token().unwrap();
        assert_eq!(token.len(), 64);
        assert_ne!(token, random_token().unwrap());
    }
}
