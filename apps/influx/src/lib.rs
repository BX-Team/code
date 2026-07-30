use std::time::Duration;

use axum::Router;
use axum::extract::DefaultBodyLimit;
use axum::http::StatusCode;
use axum::routing::{get, post};
use tower_http::timeout::TimeoutLayer;
use tower_http::trace::TraceLayer;
use types::build_info::{BuildInfo, ServiceCard, service_card};

pub mod auth;
pub mod env;
pub mod routes;
pub mod state;

pub use env::Config;
pub use state::AppState;

pub const BUILD_INFO: BuildInfo = BuildInfo {
    git_hash: match option_env!("BX_GIT_HASH") {
        Some(hash) => hash,
        None => "unknown",
    },
    comp_date: env!("BX_COMP_DATE"),
    profile: env!("BX_PROFILE"),
};

pub fn card() -> ServiceCard {
    service_card("influx", BUILD_INFO)
}

pub fn router(state: AppState) -> Router {
    let max_body = state.config.max_body_bytes;

    Router::new()
        .route("/", get(routes::card))
        .route("/health", get(routes::health))
        .route("/api/v1/ping/{project_id}", get(routes::ingest::ping))
        .route("/api/v1/e/{project_id}", post(routes::ingest::ingest))
        .layer(DefaultBodyLimit::max(max_body))
        // 503 rather than the default 408: a 4xx makes the SDK drop the batch for good, while
        // a 5xx puts it back in its queue. Well under the SDK's own 30 second request timeout.
        .layer(TimeoutLayer::with_status_code(
            StatusCode::SERVICE_UNAVAILABLE,
            Duration::from_secs(20),
        ))
        .layer(TraceLayer::new_for_http())
        .with_state(state)
}
