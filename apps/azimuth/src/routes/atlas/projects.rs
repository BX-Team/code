use std::collections::HashMap;

use axum::Json;
use axum::extract::{Path, State};
use axum::http::StatusCode;
use database::models::atlas as db;
use serde::Deserialize;
use types::atlas as api;
use util::{ApiError, ApiResult};
use utoipa::ToSchema;

use super::{find_project, project_response};
use crate::auth::secret::MachineAuth;
use crate::state::AppState;

#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateProjectBody {
    pub key: String,
    pub name: String,
    pub description: Option<String>,
}

#[utoipa::path(
    get,
    path = "/atlas/projects",
    tag = "atlas",
    responses((status = 200, body = api::ProjectsResponse))
)]
pub async fn list(State(state): State<AppState>) -> ApiResult<Json<api::ProjectsResponse>> {
    let projects = db::projects(&state.db).await?;
    let ids: Vec<i64> = projects.iter().map(|project| project.id).collect();
    let versions = db::versions_of(&state.db, &ids).await?;

    let mut by_project: HashMap<i64, Vec<String>> = HashMap::new();
    for version in versions {
        by_project
            .entry(version.project_id)
            .or_default()
            .push(version.key);
    }

    Ok(Json(api::ProjectsResponse {
        projects: projects
            .into_iter()
            .map(|project| {
                let keys = by_project.remove(&project.id).unwrap_or_default();
                project_response(project, keys)
            })
            .collect(),
    }))
}

#[utoipa::path(
    get,
    path = "/atlas/projects/{project}",
    tag = "atlas",
    params(("project" = String, Path, description = "Project key")),
    responses((status = 200, body = api::ProjectResponse), (status = 404))
)]
pub async fn get(
    State(state): State<AppState>,
    Path(project): Path<String>,
) -> ApiResult<Json<api::ProjectResponse>> {
    let project = find_project(&state, &project).await?;
    let versions = db::versions_of(&state.db, &[project.id]).await?;
    let keys = versions.into_iter().map(|version| version.key).collect();

    Ok(Json(project_response(project, keys)))
}

/// Creating a project used to mean an INSERT typed straight into the production database.
#[utoipa::path(
    post,
    path = "/atlas/projects",
    tag = "atlas",
    security(("api_secret" = [])),
    request_body = CreateProjectBody,
    responses((status = 201, body = api::ProjectResponse), (status = 409))
)]
pub async fn create(
    State(state): State<AppState>,
    _auth: MachineAuth,
    Json(body): Json<CreateProjectBody>,
) -> ApiResult<(StatusCode, Json<api::ProjectResponse>)> {
    let key = body.key.trim();
    if key.is_empty() || body.name.trim().is_empty() {
        return Err(ApiError::BadRequest("key and name are required".into()));
    }

    let project = db::create_project(
        &state.db,
        key,
        body.name.trim(),
        body.description.as_deref(),
    )
    .await
    .map_err(|error| match error {
        database::Error::Database(ref inner) if inner.is_unique_violation() => {
            ApiError::Conflict(format!("Project {key} already exists"))
        }
        other => ApiError::Database(other),
    })?;

    Ok((
        StatusCode::CREATED,
        Json(project_response(project, Vec::new())),
    ))
}
