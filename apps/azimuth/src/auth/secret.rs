use axum::extract::FromRequestParts;
use axum::http::header;
use axum::http::request::Parts;
use util::ApiError;

use crate::state::AppState;

/// Proof that the caller presented `API_SECRET_KEY`. Publishing endpoints take it by value, so
/// the check cannot be forgotten in a handler body.
#[derive(Debug, Clone, Copy)]
pub struct MachineAuth;

impl FromRequestParts<AppState> for MachineAuth {
    type Rejection = ApiError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> Result<Self, Self::Rejection> {
        let presented = parts
            .headers
            .get(header::AUTHORIZATION)
            .and_then(|value| value.to_str().ok())
            .and_then(|value| value.strip_prefix("Bearer "))
            .unwrap_or_default();

        if constant_time_eq(presented, &state.config.api_secret_key) {
            Ok(Self)
        } else {
            Err(ApiError::Unauthorized("Unauthorized".into()))
        }
    }
}

/// Comparison time must not depend on how much of the secret matched.
fn constant_time_eq(presented: &str, expected: &str) -> bool {
    if presented.len() != expected.len() {
        return false;
    }
    presented
        .bytes()
        .zip(expected.bytes())
        .fold(0u8, |difference, (a, b)| difference | (a ^ b))
        == 0
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn only_the_exact_secret_is_accepted() {
        assert!(constant_time_eq("s3cret", "s3cret"));
        assert!(!constant_time_eq("s3cret", "s3crev"));
        assert!(!constant_time_eq("s3cre", "s3cret"));
        assert!(!constant_time_eq("", "s3cret"));
        assert!(!constant_time_eq("s3cret", ""));
    }
}
