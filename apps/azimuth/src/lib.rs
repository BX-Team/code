use std::time::Duration;

use axum::extract::DefaultBodyLimit;
use axum::http::{HeaderValue, Method, StatusCode, header};
use axum::routing::{delete, get, patch, post};
use axum::{Json, Router};
use tower_http::cors::{AllowOrigin, Any, CorsLayer};
use tower_http::normalize_path::NormalizePath;
use tower_http::set_header::SetResponseHeaderLayer;
use tower_http::timeout::TimeoutLayer;
use tower_http::trace::TraceLayer;
use types::build_info::{BuildInfo, ServiceCard, git_hash, service_card};
use utoipa::OpenApi;

pub mod auth;
pub mod env;
pub mod models;
pub mod openapi;
pub mod routes;
pub mod state;

pub use env::Config;
pub use state::AppState;

pub const BUILD_INFO: BuildInfo = BuildInfo {
    git_hash: git_hash(option_env!("BX_GIT_HASH")),
    comp_date: env!("BX_COMP_DATE"),
    profile: env!("BX_PROFILE"),
};

pub fn card() -> ServiceCard {
    service_card("azimuth", BUILD_INFO)
}

/// Trailing slashes are trimmed before matching, and that has to happen ahead of routing — hence
/// the finished router being served as a fallback rather than layered onto.
pub fn router(state: AppState) -> Router {
    Router::new().fallback_service(NormalizePath::trim_trailing_slash(routes(state)))
}

fn routes(state: AppState) -> Router {
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

    // Sessions are cookies, so this group must echo one exact allowed origin, never `*`.
    let origins: Vec<HeaderValue> = state
        .config
        .trusted_origins
        .iter()
        .filter_map(|origin| HeaderValue::from_str(origin).ok())
        .collect();

    let session_cors = CorsLayer::new()
        .allow_origin(AllowOrigin::list(origins))
        .allow_credentials(true)
        .allow_methods([
            Method::GET,
            Method::POST,
            Method::PATCH,
            Method::DELETE,
            Method::OPTIONS,
        ])
        .allow_headers([header::CONTENT_TYPE, header::AUTHORIZATION]);

    let pulsify = Router::new()
        .route("/overview", get(routes::pulsify::overview::overview))
        .route("/billing", get(routes::pulsify::overview::billing))
        .route(
            "/projects",
            get(routes::pulsify::projects::list).post(routes::pulsify::projects::create),
        )
        .route("/projects/{id}", delete(routes::pulsify::projects::delete))
        .route(
            "/projects/{id}/verify",
            patch(routes::pulsify::projects::verify),
        )
        .route(
            "/projects/{id}/plugins",
            get(routes::pulsify::projects::plugins),
        )
        .route(
            "/projects/{id}/installations",
            get(routes::pulsify::projects::installations),
        )
        .route(
            "/projects/{id}/installations/{plugin_id}",
            patch(routes::pulsify::projects::set_share_errors),
        )
        .route(
            "/projects/{id}/stats",
            get(routes::pulsify::analytics::stats),
        )
        .route(
            "/projects/{id}/players",
            get(routes::pulsify::analytics::players),
        )
        .route(
            "/projects/{id}/geography",
            get(routes::pulsify::analytics::geography),
        )
        .route(
            "/projects/{id}/client-versions",
            get(routes::pulsify::analytics::client_versions),
        )
        .route(
            "/projects/{id}/session-duration",
            get(routes::pulsify::analytics::session_duration),
        )
        .route(
            "/projects/{id}/retention",
            get(routes::pulsify::analytics::retention),
        )
        .route("/projects/{id}/errors", get(routes::pulsify::errors::list))
        .route(
            "/projects/{id}/errors/payload",
            get(routes::pulsify::errors::payload),
        )
        .route(
            "/projects/{id}/errors/versions",
            get(routes::pulsify::errors::versions),
        )
        .route(
            "/projects/{id}/errors/status",
            post(routes::pulsify::errors::set_status),
        )
        .route(
            "/projects/{id}/cross-errors",
            get(routes::pulsify::errors::cross_errors),
        )
        .route(
            "/projects/{id}/cross-errors/payload",
            get(routes::pulsify::errors::cross_payload),
        )
        .route(
            "/projects/{id}/metrics",
            get(routes::pulsify::metrics::list),
        )
        .route(
            "/projects/{id}/metrics/{name}",
            get(routes::pulsify::metrics::detail),
        )
        .route(
            "/projects/{id}/tokens",
            get(routes::pulsify::tokens::list).post(routes::pulsify::tokens::create),
        )
        .route(
            "/projects/{id}/tokens/{token_id}",
            delete(routes::pulsify::tokens::revoke),
        )
        .route(
            "/projects/{id}/alerts",
            get(routes::pulsify::alerts::list).post(routes::pulsify::alerts::create),
        )
        .route(
            "/projects/{id}/alerts/{alert_id}",
            patch(routes::pulsify::alerts::update).delete(routes::pulsify::alerts::delete),
        )
        .layer(session_cors.clone());

    // The two CORS policies must not overlap: a wildcard origin would strip credentials from
    // the session group, and a credentialed one would break anonymous reads of Atlas.
    let auth = Router::new()
        .route("/me", get(routes::auth::me))
        .route("/session", get(routes::auth::get_session))
        .route("/sign-in/magic-link", post(routes::auth::magic_link::send))
        .route("/magic-link/verify", get(routes::auth::magic_link::verify))
        .route("/sign-in/{provider}", get(routes::auth::oauth::start))
        .route("/callback/{provider}", get(routes::auth::oauth::callback))
        .route("/sign-out", post(routes::auth::sign_out))
        .route("/update-user", post(routes::auth::update_user))
        .route("/delete-user", post(routes::auth::delete_user))
        .route("/admin/users", get(routes::auth::admin::list_users))
        .route("/admin/users/{id}", delete(routes::auth::admin::remove))
        .route("/admin/users/{id}/ban", post(routes::auth::admin::ban))
        .route("/admin/users/{id}/unban", post(routes::auth::admin::unban))
        .route(
            "/admin/users/{id}/mail",
            post(routes::auth::admin::send_mail),
        )
        .layer(session_cors);

    let public = Router::new()
        .route("/", get(routes::internal::card))
        .route("/health", get(routes::internal::health))
        .route("/openapi.json", get(openapi_document))
        .nest("/atlas", atlas)
        .layer(public_cors);

    public
        .nest("/auth", auth)
        .nest("/pulsify", pulsify)
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
