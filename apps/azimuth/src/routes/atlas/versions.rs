use axum::Json;
use axum::extract::{Path, State};
use axum::http::StatusCode;
use database::models::atlas as db;
use serde::Serialize;
use types::atlas as api;
use util::{ApiError, ApiResult};
use utoipa::ToSchema;

use super::{find_project, find_version, version_response};
use crate::auth::secret::MachineAuth;
use crate::state::AppState;

#[derive(Debug, Serialize, ToSchema)]
pub struct Created {
    pub message: String,
    pub version: String,
}

#[utoipa::path(
    get,
    path = "/atlas/projects/{project}/versions",
    tag = "atlas",
    params(("project" = String, Path, description = "Project key")),
    responses((status = 200, body = Vec<api::VersionResponse>), (status = 404))
)]
pub async fn list(
    State(state): State<AppState>,
    Path(project): Path<String>,
) -> ApiResult<Json<Vec<api::VersionResponse>>> {
    let project = find_project(&state, &project).await?;
    let versions = db::versions_of(&state.db, &[project.id]).await?;

    let mut responses = Vec::with_capacity(versions.len());
    for version in versions {
        let builds = db::build_numbers(&state.db, version.id).await?;
        responses.push(version_response(version, builds));
    }

    Ok(Json(responses))
}

#[utoipa::path(
    get,
    path = "/atlas/projects/{project}/versions/{version}",
    tag = "atlas",
    params(
        ("project" = String, Path, description = "Project key"),
        ("version" = String, Path, description = "Version key")
    ),
    responses((status = 200, body = api::VersionResponse), (status = 404))
)]
pub async fn get(
    State(state): State<AppState>,
    Path((project, version)): Path<(String, String)>,
) -> ApiResult<Json<api::VersionResponse>> {
    let project = find_project(&state, &project).await?;
    let version = find_version(&state, &project, &version).await?;
    let builds = db::build_numbers(&state.db, version.id).await?;

    Ok(Json(version_response(version, builds)))
}

#[utoipa::path(
    post,
    path = "/atlas/projects/{project}/versions/create",
    tag = "atlas",
    security(("api_secret" = [])),
    params(("project" = String, Path, description = "Project key")),
    request_body = api::CreateVersionBody,
    responses((status = 201, body = Created), (status = 404), (status = 409))
)]
pub async fn create(
    State(state): State<AppState>,
    Path(project): Path<String>,
    _auth: MachineAuth,
    Json(body): Json<api::CreateVersionBody>,
) -> ApiResult<(StatusCode, Json<Created>)> {
    let project = find_project(&state, &project).await?;
    let key = body.key.trim();
    if key.is_empty() {
        return Err(ApiError::BadRequest("key is required".into()));
    }

    let status = body.support_status.unwrap_or(api::SupportStatus::Supported);
    let version = db::create_version(
        &state.db,
        project.id,
        key,
        status.as_str(),
        body.java_min_version,
    )
    .await
    .map_err(|error| match error {
        database::Error::Database(ref inner) if inner.is_unique_violation() => {
            ApiError::Conflict(format!("Version {key} already exists"))
        }
        other => ApiError::Database(other),
    })?;

    Ok((
        StatusCode::CREATED,
        Json(Created {
            message: "Version created".into(),
            version: version.key,
        }),
    ))
}
