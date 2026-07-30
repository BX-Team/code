use axum::Json;
use axum::extract::{Path, Query, State};
use database::models::atlas as db;
use types::atlas as api;
use util::{ApiError, ApiResult};

use super::{build_details, build_response, find_project, find_version};
use crate::state::AppState;

#[utoipa::path(
    get,
    path = "/atlas/projects/{project}/versions/{version}/builds",
    tag = "atlas",
    params(
        ("project" = String, Path, description = "Project key"),
        ("version" = String, Path, description = "Version key"),
        ("channel" = Option<api::Channel>, Query, description = "Only builds on this channel")
    ),
    responses((status = 200, body = Vec<api::Build>), (status = 404))
)]
pub async fn list(
    State(state): State<AppState>,
    Path((project, version)): Path<(String, String)>,
    Query(query): Query<api::BuildsQuery>,
) -> ApiResult<Json<Vec<api::Build>>> {
    let project = find_project(&state, &project).await?;
    let version = find_version(&state, &project, &version).await?;

    let builds = db::builds_of(
        &state.db,
        version.id,
        query.channel.map(api::Channel::as_str),
    )
    .await?;
    let (commits, downloads) = build_details(State(state.clone()), &builds).await?;

    Ok(Json(
        builds
            .into_iter()
            .map(|build| {
                let build_id = build.id;
                build_response(
                    build,
                    commits
                        .iter()
                        .filter(|c| c.build_id == build_id)
                        .cloned()
                        .collect(),
                    downloads
                        .iter()
                        .filter(|d| d.build_id == build_id)
                        .cloned()
                        .collect(),
                    &state.storage,
                )
            })
            .collect(),
    ))
}

#[utoipa::path(
    get,
    path = "/atlas/projects/{project}/versions/{version}/builds/latest",
    tag = "atlas",
    params(
        ("project" = String, Path, description = "Project key"),
        ("version" = String, Path, description = "Version key")
    ),
    responses((status = 200, body = api::Build), (status = 404))
)]
pub async fn latest(
    State(state): State<AppState>,
    Path((project, version)): Path<(String, String)>,
) -> ApiResult<Json<api::Build>> {
    let project = find_project(&state, &project).await?;
    let version = find_version(&state, &project, &version).await?;

    let build = db::latest_build(&state.db, version.id)
        .await?
        .ok_or_else(|| ApiError::NotFound("No builds for this version".into()))?;

    one(&state, build).await
}

#[utoipa::path(
    get,
    path = "/atlas/projects/{project}/versions/{version}/builds/{build}",
    tag = "atlas",
    params(
        ("project" = String, Path, description = "Project key"),
        ("version" = String, Path, description = "Version key"),
        ("build" = i64, Path, description = "Build number")
    ),
    responses((status = 200, body = api::Build), (status = 404))
)]
pub async fn get(
    State(state): State<AppState>,
    Path((project, version, number)): Path<(String, String, i64)>,
) -> ApiResult<Json<api::Build>> {
    let project = find_project(&state, &project).await?;
    let version = find_version(&state, &project, &version).await?;

    let build = db::build(&state.db, version.id, number)
        .await?
        .ok_or_else(|| ApiError::NotFound(format!("Build {number} not found")))?;

    one(&state, build).await
}

async fn one(state: &AppState, build: db::Build) -> ApiResult<Json<api::Build>> {
    let commits = db::commits_of(&state.db, &[build.id]).await?;
    let downloads = db::downloads_of(&state.db, &[build.id]).await?;

    Ok(Json(build_response(
        build,
        commits,
        downloads,
        &state.storage,
    )))
}
