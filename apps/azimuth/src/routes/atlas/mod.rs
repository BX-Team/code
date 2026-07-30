use axum::extract::State;
use database::models::atlas as db;
use indexmap::IndexMap;
use types::atlas as api;
use util::{ApiError, ApiResult};

use crate::state::AppState;

pub mod builds;
pub mod projects;
pub mod upload;
pub mod versions;

/// Public reads are safe to cache for a while; publishing invalidates nothing, it only appends.
pub const CACHE_CONTROL: &str = "public, max-age=300, stale-while-revalidate=60";

pub fn project_response(project: db::Project, version_keys: Vec<String>) -> api::ProjectResponse {
    api::ProjectResponse {
        project: api::Project {
            id: project.key,
            name: project.name,
            description: api::non_empty(project.description),
            latest_version: api::non_empty(project.latest_version),
            experimental_version: api::non_empty(project.experimental_version),
        },
        version_groups: types::version::group_versions(version_keys),
    }
}

pub fn version_response(version: db::Version, build_numbers: Vec<i64>) -> api::VersionResponse {
    api::VersionResponse {
        version: api::Version {
            id: version.key,
            java: version
                .java_min_version
                .filter(|minimum| *minimum > 0)
                .map(|minimum| api::JavaRequirement {
                    version: api::JavaVersion { minimum },
                }),
            support: api::Support {
                status: support_status(&version.support_status),
            },
        },
        builds: build_numbers,
    }
}

pub fn build_response(
    build: db::Build,
    commits: Vec<db::Commit>,
    downloads: Vec<db::Download>,
    storage: &storage::Storage,
) -> api::Build {
    let mut map = IndexMap::new();
    for download in downloads {
        map.insert(
            download.name,
            api::Download {
                name: download.file_name,
                checksums: api::Checksums {
                    sha256: download.sha256,
                },
                size: download.size,
                url: storage.public_url(&download.file_path),
            },
        );
    }

    api::Build {
        id: build.build_number,
        time: build.time,
        channel: channel(&build.channel),
        commits: commits
            .into_iter()
            .map(|commit| api::Commit {
                sha: commit.sha,
                message: commit.message,
                time: commit.time,
            })
            .collect(),
        downloads: map,
    }
}

pub fn channel(value: &str) -> api::Channel {
    match value {
        "ALPHA" => api::Channel::Alpha,
        "BETA" => api::Channel::Beta,
        _ => api::Channel::Stable,
    }
}

pub fn support_status(value: &str) -> api::SupportStatus {
    match value {
        "DEPRECATED" => api::SupportStatus::Deprecated,
        "UNSUPPORTED" => api::SupportStatus::Unsupported,
        _ => api::SupportStatus::Supported,
    }
}

pub async fn find_project(state: &AppState, key: &str) -> ApiResult<db::Project> {
    db::project(&state.db, key)
        .await?
        .ok_or_else(|| ApiError::NotFound(format!("Project {key} not found")))
}

pub async fn find_version(
    state: &AppState,
    project: &db::Project,
    key: &str,
) -> ApiResult<db::Version> {
    db::version(&state.db, project.id, key)
        .await?
        .ok_or_else(|| ApiError::NotFound(format!("Version {key} not found")))
}

/// Loads commits and downloads for a set of builds in two queries rather than two per build.
pub async fn build_details(
    State(state): State<AppState>,
    builds: &[db::Build],
) -> ApiResult<(Vec<db::Commit>, Vec<db::Download>)> {
    if builds.is_empty() {
        return Ok((Vec::new(), Vec::new()));
    }

    let ids: Vec<i64> = builds.iter().map(|build| build.id).collect();
    Ok((
        db::commits_of(&state.db, &ids).await?,
        db::downloads_of(&state.db, &ids).await?,
    ))
}
