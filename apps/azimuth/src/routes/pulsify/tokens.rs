use axum::Json;
use axum::extract::{Path, State};
use axum::http::StatusCode;
use database::models::pulsify as db;
use rand::TryRng;
use util::{ApiError, ApiResult};
use uuid::Uuid;

use crate::auth::project::OwnedProject;
use crate::models::pulsify as api;
use crate::state::AppState;

#[utoipa::path(get, path = "/pulsify/projects/{id}/tokens", tag = "pulsify",
    params(("id" = Uuid, Path, description = "Project id")),
    responses((status = 200, body = Vec<api::Token>), (status = 404)))]
pub async fn list(
    State(state): State<AppState>,
    owned: OwnedProject,
) -> ApiResult<Json<Vec<api::Token>>> {
    let tokens = db::tokens_of(&state.db, owned.project.id).await?;

    Ok(Json(
        tokens
            .into_iter()
            .map(|token| api::Token {
                id: token.id,
                label: token.label,
                revoked: token.revoked,
                last_used_at: token.last_used_at.map(api::iso),
                created_at: api::iso(token.created_at),
            })
            .collect(),
    ))
}

/// Creates a token. This is the only time its key is ever returned.
#[utoipa::path(post, path = "/pulsify/projects/{id}/tokens", tag = "pulsify",
    params(("id" = Uuid, Path, description = "Project id")),
    request_body = api::CreateToken,
    responses((status = 201, body = api::CreatedToken), (status = 404)))]
pub async fn create(
    State(state): State<AppState>,
    owned: OwnedProject,
    Json(body): Json<api::CreateToken>,
) -> ApiResult<(StatusCode, Json<api::CreatedToken>)> {
    let key = random_key()?;
    let label = body
        .label
        .as_deref()
        .map(str::trim)
        .filter(|l| !l.is_empty());

    let token = db::create_token(&state.db, owned.project.id, &key, label).await?;

    Ok((
        StatusCode::CREATED,
        Json(api::CreatedToken {
            id: token.id,
            key,
            label: token.label,
            created_at: api::iso(token.created_at),
        }),
    ))
}

/// Revokes rather than deletes: an ingest token's history has to stay attributable.
#[utoipa::path(delete, path = "/pulsify/projects/{id}/tokens/{token_id}", tag = "pulsify",
    params(
        ("id" = Uuid, Path, description = "Project id"),
        ("token_id" = Uuid, Path, description = "Token id")
    ),
    responses((status = 204), (status = 404)))]
pub async fn revoke(
    State(state): State<AppState>,
    owned: OwnedProject,
    Path(path): Path<(Uuid, Uuid)>,
) -> ApiResult<StatusCode> {
    let (_, token_id) = path;
    if !db::revoke_token(&state.db, owned.project.id, token_id).await? {
        return Err(ApiError::NotFound("Token not found".into()));
    }

    Ok(StatusCode::NO_CONTENT)
}

fn random_key() -> ApiResult<String> {
    let mut bytes = [0u8; 32];
    rand::rngs::SysRng
        .try_fill_bytes(&mut bytes)
        .map_err(|error| ApiError::internal(error.to_string()))?;
    Ok(hex::encode(bytes))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn keys_are_unpredictable_and_the_expected_width() {
        let first = random_key().unwrap();
        assert_eq!(first.len(), 64);
        assert!(first.bytes().all(|byte| byte.is_ascii_hexdigit()));
        assert_ne!(first, random_key().unwrap());
    }
}
