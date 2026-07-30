use utoipa::openapi::security::{ApiKey, ApiKeyValue, SecurityScheme};
use utoipa::{Modify, OpenApi};

use crate::routes::{atlas, internal};

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
    ),
    tags(
        (name = "atlas", description = "Project, version and build metadata"),
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
