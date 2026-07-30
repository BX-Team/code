use axum::extract::{FromRequestParts, Path};
use axum::http::request::Parts;
use axum::http::{HeaderValue, StatusCode, header};
use axum::response::{IntoResponse, Response};
use util::{ApiError, ip::client_ip};
use uuid::Uuid;

use crate::state::AppState;

/// A request that carries a valid DSN token for the project in its path.
///
/// Rate limiting happens inside the extractor so an unknown token is limited too, before it
/// reaches the database.
#[derive(Debug, Clone)]
pub struct DsnAuth {
    pub token: String,
    pub project_id: Uuid,
    pub ip: Option<String>,
}

impl FromRequestParts<AppState> for DsnAuth {
    type Rejection = AuthRejection;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> Result<Self, Self::Rejection> {
        let token = bearer(parts);
        let ip = client_ip(&parts.headers);

        let limit_key = match token.as_deref() {
            Some(token) => token.to_owned(),
            None => format!("ip:{}", ip.as_deref().unwrap_or("unknown")),
        };
        state
            .limiter
            .check(&limit_key)
            .map_err(AuthRejection::Api)?;

        let Some(token) = token else {
            return Err(AuthRejection::unauthorized());
        };

        let Path(project_id) = Path::<Uuid>::from_request_parts(parts, state)
            .await
            .map_err(|_| AuthRejection::unauthorized())?;

        let record = database::models::pulsify::authenticate_token(&state.db, &token)
            .await
            .map_err(|error| AuthRejection::Api(ApiError::Database(error)))?;

        // A token that belongs to another project is indistinguishable from an unknown one.
        let Some((token_id, _)) = record.filter(|(_, id)| *id == project_id) else {
            return Err(AuthRejection::unauthorized());
        };

        let db = state.db.clone();
        tokio::spawn(async move {
            if let Err(error) = database::models::pulsify::touch_token(&db, token_id).await {
                tracing::warn!(%error, "could not record token use");
            }
        });

        Ok(Self {
            token,
            project_id,
            ip,
        })
    }
}

#[derive(Debug)]
pub enum AuthRejection {
    Api(ApiError),
    Unauthorized,
}

impl AuthRejection {
    fn unauthorized() -> Self {
        Self::Unauthorized
    }
}

impl IntoResponse for AuthRejection {
    fn into_response(self) -> Response {
        match self {
            Self::Api(error) => error.into_response(),
            Self::Unauthorized => {
                let mut response = ApiError::Unauthorized("Invalid token".into()).into_response();
                response
                    .headers_mut()
                    .insert(header::WWW_AUTHENTICATE, HeaderValue::from_static("Bearer"));
                debug_assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
                response
            }
        }
    }
}

fn bearer(parts: &Parts) -> Option<String> {
    parts
        .headers
        .get(header::AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.strip_prefix("Bearer "))
        .map(str::trim)
        .filter(|token| !token.is_empty())
        .map(ToOwned::to_owned)
}
