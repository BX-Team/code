use utoipa::openapi::security::{ApiKey, ApiKeyValue, SecurityScheme};
use utoipa::{Modify, OpenApi};

use crate::routes::{atlas, auth, internal, pulsify};

#[derive(OpenApi)]
#[openapi(
    info(
        title = "BX Team API",
        description = "Atlas download metadata for BX Team projects.",
        license(name = "AGPL-3.0-only")
    ),
    servers((url = "https://api.bxteam.org")),
    paths(
        internal::card,
        internal::health,
        atlas::projects::list,
        atlas::projects::get,
        atlas::projects::create,
        atlas::versions::list,
        atlas::versions::get,
        atlas::versions::create,
        atlas::builds::list,
        atlas::builds::latest,
        atlas::builds::get,
        atlas::upload::upload,
        pulsify::overview::overview,
        pulsify::overview::billing,
        pulsify::projects::list,
        pulsify::projects::create,
        pulsify::projects::delete,
        pulsify::projects::verify,
        pulsify::projects::plugins,
        pulsify::projects::installations,
        pulsify::projects::set_share_errors,
        pulsify::analytics::stats,
        pulsify::analytics::players,
        pulsify::analytics::geography,
        pulsify::analytics::client_versions,
        pulsify::analytics::session_duration,
        pulsify::analytics::retention,
        pulsify::errors::list,
        pulsify::errors::payload,
        pulsify::errors::versions,
        pulsify::errors::set_status,
        pulsify::errors::cross_errors,
        pulsify::errors::cross_payload,
        pulsify::metrics::list,
        pulsify::metrics::detail,
        pulsify::tokens::list,
        pulsify::tokens::create,
        pulsify::tokens::revoke,
        pulsify::alerts::list,
        pulsify::alerts::create,
        pulsify::alerts::update,
        pulsify::alerts::delete,
        auth::me,
        auth::get_session,
        auth::sign_out,
        auth::update_user,
        auth::delete_user,
        auth::magic_link::send,
        auth::magic_link::verify,
        auth::oauth::start,
        auth::oauth::callback,
        auth::admin::list_users,
        auth::admin::ban,
        auth::admin::unban,
        auth::admin::remove,
    ),
    tags(
        (name = "atlas", description = "Project, version and build metadata"),
        (name = "pulsify", description = "Projects, telemetry, errors and alerts"),
        (name = "auth", description = "Sign-in, sessions and user administration"),
        (name = "internal", description = "Service health and identity")
    ),
    modifiers(&SecretScheme)
)]
pub struct ApiDoc;

struct SecretScheme;

impl Modify for SecretScheme {
    fn modify(&self, openapi: &mut utoipa::openapi::OpenApi) {
        if let Some(components) = openapi.components.as_mut() {
            components.add_security_scheme(
                "api_secret",
                SecurityScheme::ApiKey(ApiKey::Header(ApiKeyValue::new("Authorization"))),
            );
        }
    }
}
