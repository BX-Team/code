use axum::extract::FromRequestParts;
use axum::http::header;
use axum::http::request::Parts;
use chrono::Utc;
use database::models::auth::User;
use sha2::{Digest, Sha256};
use util::ApiError;

use crate::state::AppState;

pub const COOKIE_NAME: &str = "bx_session";

/// Session tokens are stored hashed, so a database dump is not a set of usable cookies.
pub fn hash_token(token: &str) -> Vec<u8> {
    Sha256::digest(token.as_bytes()).to_vec()
}

/// A request carrying a valid, unexpired session for a user who is not banned.
#[derive(Debug, Clone)]
pub struct Session {
    pub user: User,
}

impl FromRequestParts<AppState> for Session {
    type Rejection = ApiError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> Result<Self, Self::Rejection> {
        let token = cookie(parts, COOKIE_NAME)
            .ok_or_else(|| ApiError::Unauthorized("Unauthorized".into()))?;

        let user = database::models::auth::session_user(&state.db, &hash_token(&token))
            .await?
            .ok_or_else(|| ApiError::Unauthorized("Unauthorized".into()))?;

        if user.is_banned(Utc::now()) {
            return Err(ApiError::Forbidden(
                user.ban_reason.unwrap_or_else(|| "Account banned".into()),
            ));
        }

        Ok(Self { user })
    }
}

impl axum::extract::OptionalFromRequestParts<AppState> for Session {
    type Rejection = ApiError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> Result<Option<Self>, Self::Rejection> {
        match <Self as FromRequestParts<AppState>>::from_request_parts(parts, state).await {
            Ok(session) => Ok(Some(session)),
            // Not signed in is the normal case for a page load, not a failure.
            Err(ApiError::Unauthorized(_)) => Ok(None),
            Err(error) => Err(error),
        }
    }
}

/// A session belonging to an administrator.
#[derive(Debug, Clone)]
pub struct AdminSession {
    pub user: User,
}

impl FromRequestParts<AppState> for AdminSession {
    type Rejection = ApiError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> Result<Self, Self::Rejection> {
        let Session { user } = Session::from_request_parts(parts, state).await?;

        if user.is_admin() {
            Ok(Self { user })
        } else {
            Err(ApiError::Forbidden("Forbidden".into()))
        }
    }
}

/// The session cookie as sent, without checking whether it still resolves to anything.
pub fn raw_cookie(parts: &Parts) -> Option<String> {
    cookie(parts, COOKIE_NAME)
}

fn cookie(parts: &Parts, name: &str) -> Option<String> {
    parts
        .headers
        .get_all(header::COOKIE)
        .iter()
        .filter_map(|value| value.to_str().ok())
        .flat_map(|value| value.split(';'))
        .filter_map(|pair| pair.trim().split_once('='))
        .find(|(key, _)| *key == name)
        .map(|(_, value)| value.trim().to_owned())
        .filter(|value| !value.is_empty())
}

#[cfg(test)]
mod tests {
    use axum::http::Request;

    use super::*;

    fn parts_with(cookie_header: &str) -> Parts {
        Request::get("/")
            .header(header::COOKIE, cookie_header)
            .body(())
            .unwrap()
            .into_parts()
            .0
    }

    #[test]
    fn the_session_cookie_is_found_among_others() {
        assert_eq!(
            cookie(
                &parts_with("theme=dark; bx_session=abc123; other=1"),
                COOKIE_NAME
            )
            .as_deref(),
            Some("abc123")
        );
        assert_eq!(
            cookie(&parts_with("bx_session=abc"), COOKIE_NAME).as_deref(),
            Some("abc")
        );
        assert_eq!(cookie(&parts_with("theme=dark"), COOKIE_NAME), None);
        assert_eq!(cookie(&parts_with("bx_session="), COOKIE_NAME), None);
    }

    #[test]
    fn the_stored_hash_is_not_the_token() {
        let hash = hash_token("s3cret");
        assert_eq!(hash.len(), 32);
        assert_ne!(hash, b"s3cret");
        assert_eq!(hash, hash_token("s3cret"));
        assert_ne!(hash, hash_token("s3cres"));
    }
}
