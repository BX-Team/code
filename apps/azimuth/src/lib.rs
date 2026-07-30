use std::time::Duration;

use axum::extract::DefaultBodyLimit;
use axum::http::{HeaderValue, Method, StatusCode, header};
use axum::routing::{get, post};
use axum::{Json, Router};
use tower_http::cors::{Any, CorsLayer};
use tower_http::set_header::SetResponseHeaderLayer;
use tower_http::timeout::TimeoutLayer;
use tower_http::trace::TraceLayer;
use types::build_info::{BuildInfo, ServiceCard, service_card};
use utoipa::OpenApi;

pub mod auth;
pub mod env;
pub mod openapi;
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
    service_card("azimuth", BUILD_INFO)
}

pub fn router(state: AppState) -> Router {
    let max_upload = state.config.max_upload_bytes;

    // Public reads, no credentials: the downloads page fetches these from the browser.
    let public_cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([Method::GET, Method::POST, Method::OPTIONS])
        .allow_headers([header::CONTENT_TYPE, header::AUTHORIZATION]);

    let atlas = Router::new()
        .route(
            "/projects",
            get(routes::atlas::projects::list).post(routes::atlas::projects::create),
        )
        .route("/projects/{project}", get(routes::atlas::projects::get))
        .route(
            "/projects/{project}/versions",
            get(routes::atlas::versions::list),
        )
        .route(
            "/projects/{project}/versions/create",
            post(routes::atlas::versions::create),
        )
        .route(
            "/projects/{project}/versions/{version}",
            get(routes::atlas::versions::get),
        )
        .route(
            "/projects/{project}/versions/{version}/builds",
            get(routes::atlas::builds::list),
        )
        .route(
            "/projects/{project}/versions/{version}/builds/latest",
            get(routes::atlas::builds::latest),
        )
        .route(
            "/projects/{project}/versions/{version}/builds/upload",
            post(routes::atlas::upload::upload).layer(DefaultBodyLimit::max(max_upload)),
        )
        .route(
            "/projects/{project}/versions/{version}/builds/{build}",
            get(routes::atlas::builds::get),
        )
        .layer(SetResponseHeaderLayer::if_not_present(
            header::CACHE_CONTROL,
            HeaderValue::from_static(routes::atlas::CACHE_CONTROL),
        ));

    Router::new()
        .route("/", get(routes::internal::card))
        .route("/health", get(routes::internal::health))
        .route("/openapi.json", get(openapi_document))
        .nest("/atlas", atlas)
        .layer(public_cors)
        .layer(TimeoutLayer::with_status_code(
            StatusCode::SERVICE_UNAVAILABLE,
            Duration::from_secs(600),
        ))
        .layer(TraceLayer::new_for_http())
        .with_state(state)
}

async fn openapi_document() -> Json<utoipa::openapi::OpenApi> {
    Json(openapi::ApiDoc::openapi())
}
