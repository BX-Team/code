use axum::Json;
use axum::http::{HeaderValue, StatusCode, header};
use axum::response::{IntoResponse, Response};
use serde::Serialize;

pub type ApiResult<T> = Result<T, ApiError>;

/// The single error shape every endpoint answers with.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct ErrorBody {
    pub error: &'static str,
    pub message: String,
}

#[derive(Debug, thiserror::Error)]
pub enum ApiError {
    #[error("{0}")]
    BadRequest(String),

    #[error("{0}")]
    Unauthorized(String),

    #[error("{0}")]
    Forbidden(String),

    #[error("{0}")]
    NotFound(String),

    #[error("{0}")]
    Conflict(String),

    #[error("{0}")]
    PayloadTooLarge(String),

    /// Carries `Retry-After` in seconds; the SDK honours it over its own backoff.
    #[error("{message}")]
    TooManyRequests { retry_after: u64, message: String },

    #[error("{0}")]
    ServiceUnavailable(String),

    #[error(transparent)]
    Database(#[from] sqlx::Error),

    #[cfg(feature = "analytics")]
    #[error(transparent)]
    Analytics(#[from] clickhouse::error::Error),

    #[error(transparent)]
    Internal(#[from] anyhow_like::Internal),
}

impl ApiError {
    pub fn internal(message: impl Into<String>) -> Self {
        Self::Internal(anyhow_like::Internal(message.into()))
    }

    fn parts(&self) -> (StatusCode, &'static str) {
        match self {
            Self::BadRequest(_) => (StatusCode::BAD_REQUEST, "Bad Request"),
            Self::Unauthorized(_) => (StatusCode::UNAUTHORIZED, "Unauthorized"),
            Self::Forbidden(_) => (StatusCode::FORBIDDEN, "Forbidden"),
            Self::NotFound(_) => (StatusCode::NOT_FOUND, "Not Found"),
            Self::Conflict(_) => (StatusCode::CONFLICT, "Conflict"),
            Self::PayloadTooLarge(_) => (StatusCode::PAYLOAD_TOO_LARGE, "Payload Too Large"),
            Self::TooManyRequests { .. } => (StatusCode::TOO_MANY_REQUESTS, "Too Many Requests"),
            Self::ServiceUnavailable(_) => (StatusCode::SERVICE_UNAVAILABLE, "Service Unavailable"),
            _ => (StatusCode::INTERNAL_SERVER_ERROR, "Internal Server Error"),
        }
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let (status, error) = self.parts();

        // Storage failures are transient: reporting them as 4xx would make the SDK drop the
        // batch instead of retrying it.
        let message = if status == StatusCode::INTERNAL_SERVER_ERROR {
            tracing::error!(error = %self, "request failed");
            error.to_string()
        } else {
            self.to_string()
        };

        let mut response = (status, Json(ErrorBody { error, message })).into_response();

        if let Self::TooManyRequests { retry_after, .. } = self
            && let Ok(value) = HeaderValue::from_str(&retry_after.to_string())
        {
            response.headers_mut().insert(header::RETRY_AFTER, value);
        }

        response
    }
}

/// Newtype so an opaque internal failure is still a `std::error::Error`.
pub mod anyhow_like {
    #[derive(Debug, thiserror::Error)]
    #[error("{0}")]
    pub struct Internal(pub String);
}

#[cfg(test)]
mod tests {
    use axum::body::to_bytes;

    use super::*;

    async fn body_of(error: ApiError) -> (StatusCode, Option<String>, String) {
        let response = error.into_response();
        let status = response.status();
        let retry_after = response
            .headers()
            .get(header::RETRY_AFTER)
            .map(|value| value.to_str().unwrap().to_owned());
        let bytes = to_bytes(response.into_body(), usize::MAX).await.unwrap();
        (
            status,
            retry_after,
            String::from_utf8(bytes.to_vec()).unwrap(),
        )
    }

    #[tokio::test]
    async fn every_error_carries_a_message_the_dashboard_can_show() {
        let (status, _, body) = body_of(ApiError::NotFound("no such project".into())).await;
        assert_eq!(status, StatusCode::NOT_FOUND);
        assert_eq!(body, r#"{"error":"Not Found","message":"no such project"}"#);
    }

    #[tokio::test]
    async fn rate_limits_tell_the_sdk_when_to_come_back() {
        let (status, retry_after, body) = body_of(ApiError::TooManyRequests {
            retry_after: 60,
            message: "rate limit exceeded".into(),
        })
        .await;
        assert_eq!(status, StatusCode::TOO_MANY_REQUESTS);
        assert_eq!(retry_after.as_deref(), Some("60"));
        assert!(body.contains("rate limit exceeded"));
    }

    #[tokio::test]
    async fn internal_failures_do_not_leak_their_cause() {
        let (status, _, body) = body_of(ApiError::internal("connection refused: 127.0.0.1")).await;
        assert_eq!(status, StatusCode::INTERNAL_SERVER_ERROR);
        assert!(!body.contains("127.0.0.1"), "{body}");
    }
}
