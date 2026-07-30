use axum::Json;
use axum::extract::multipart::Field;
use axum::extract::{Multipart, Path, State};
use chrono::Utc;
use database::models::atlas as db;
use futures::TryStreamExt;
use serde::Serialize;
use types::atlas as api;
use util::{ApiError, ApiResult};
use utoipa::ToSchema;

use super::{build_response, channel, find_project, find_version};
use crate::auth::secret::MachineAuth;
use crate::state::AppState;

#[derive(Debug, Serialize, ToSchema)]
pub struct Uploaded {
    pub message: String,
    pub build: api::Build,
}

/// Publishes a build: the artifact streams into R2 while one transaction holds the build row.
///
/// The transaction stays open for the length of the upload on purpose. It is the only way the
/// build number, the object and the metadata can be all-or-nothing, and publishing is rare.
#[utoipa::path(
    post,
    path = "/atlas/projects/{project}/versions/{version}/builds/upload",
    tag = "atlas",
    security(("api_secret" = [])),
    params(
        ("project" = String, Path, description = "Project key"),
        ("version" = String, Path, description = "Version key")
    ),
    request_body(content = String, content_type = "multipart/form-data"),
    responses((status = 200, body = Uploaded), (status = 404), (status = 409))
)]
pub async fn upload(
    State(state): State<AppState>,
    Path((project, version)): Path<(String, String)>,
    _auth: MachineAuth,
    mut multipart: Multipart,
) -> ApiResult<Json<Uploaded>> {
    let project = find_project(&state, &project).await?;
    let version = find_version(&state, &project, &version).await?;

    let mut metadata = api::UploadMetadata::default();
    let mut result: Option<(api::Build, String)> = None;

    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|error| ApiError::BadRequest(error.to_string()))?
    {
        let name = field.name().unwrap_or_default().to_owned();
        match name.as_str() {
            // The file is streamed where it is found, so the metadata fields have to precede it.
            "file" => {
                let file_name = field
                    .file_name()
                    .map(sanitize_file_name)
                    .filter(|name| !name.is_empty())
                    .ok_or_else(|| ApiError::BadRequest("file has no name".into()))?;

                result =
                    Some(store(&state, &project, &version, &metadata, &file_name, field).await?);
            }
            "metadata" => {
                let text = field
                    .text()
                    .await
                    .map_err(|error| ApiError::BadRequest(error.to_string()))?;
                metadata = serde_json::from_str(&text)
                    .map_err(|error| ApiError::BadRequest(format!("invalid metadata: {error}")))?;
            }
            other => {
                let text = field
                    .text()
                    .await
                    .map_err(|error| ApiError::BadRequest(error.to_string()))?;
                apply_field(&mut metadata, other, &text)?;
            }
        }
    }

    let Some((build, _)) = result else {
        return Err(ApiError::BadRequest("no file was uploaded".into()));
    };

    Ok(Json(Uploaded {
        message: "Build uploaded".into(),
        build,
    }))
}

async fn store(
    state: &AppState,
    project: &db::Project,
    version: &db::Version,
    metadata: &api::UploadMetadata,
    file_name: &str,
    field: Field<'_>,
) -> ApiResult<(api::Build, String)> {
    let mut tx = state.db.begin().await?;

    let build_number = match metadata.build_number {
        Some(number) => number,
        None => db::next_build_number(&mut tx, version.id).await?,
    };

    let channel_value = metadata.channel.unwrap_or(api::Channel::Stable);
    let build = db::insert_build(
        &mut tx,
        version.id,
        build_number,
        channel_value.as_str(),
        Utc::now(),
    )
    .await
    .map_err(|error| match error {
        database::Error::Database(ref inner) if inner.is_unique_violation() => {
            ApiError::Conflict(format!("Build {build_number} already exists"))
        }
        other => ApiError::Database(other),
    })?;

    let key = storage::build_key(&project.key, &version.key, build_number, file_name);
    let stream = field.map_err(|error| error.to_string());

    let uploaded = state
        .storage
        .put_build_streaming(&key, storage::content_type_for(file_name), stream)
        .await
        .map_err(|error| ApiError::internal(error.to_string()))?;

    if let Some(commits) = &metadata.commits {
        let shas: Vec<String> = commits.iter().map(|commit| commit.sha.clone()).collect();
        let messages: Vec<String> = commits.iter().map(|c| c.message.clone()).collect();
        let times: Vec<_> = commits.iter().map(|commit| commit.time).collect();
        db::insert_commits(&mut tx, build.id, &shas, &messages, &times).await?;
    }

    db::insert_download(
        &mut tx,
        build.id,
        "application",
        file_name,
        &key,
        i64::try_from(uploaded.size).unwrap_or(i64::MAX),
        &uploaded.sha256,
    )
    .await?;

    if let Err(error) = tx.commit().await {
        // The row never existed as far as anyone else is concerned, so neither should the object.
        let _ = state.storage.delete_build(&key).await;
        return Err(ApiError::Database(error));
    }

    let commits = db::commits_of(&state.db, &[build.id]).await?;
    let downloads = db::downloads_of(&state.db, &[build.id]).await?;

    Ok((
        build_response(build, commits, downloads, &state.storage),
        key,
    ))
}

/// Older publishers send the metadata as separate form fields instead of one JSON blob.
fn apply_field(metadata: &mut api::UploadMetadata, name: &str, value: &str) -> ApiResult<()> {
    match name {
        "buildNumber" => {
            metadata.build_number = Some(
                value
                    .parse()
                    .map_err(|_| ApiError::BadRequest("buildNumber must be a number".into()))?,
            );
        }
        "channel" => metadata.channel = Some(channel(value)),
        "commits" => {
            metadata.commits = Some(
                serde_json::from_str(value)
                    .map_err(|error| ApiError::BadRequest(format!("invalid commits: {error}")))?,
            );
        }
        _ => {}
    }
    Ok(())
}

/// Keeps the object key a single path segment whatever the publisher called the file.
fn sanitize_file_name(name: &str) -> String {
    name.rsplit(['/', '\\'])
        .next()
        .unwrap_or_default()
        .trim()
        .to_owned()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_traversing_file_name_cannot_escape_its_prefix() {
        assert_eq!(sanitize_file_name("../../etc/passwd"), "passwd");
        assert_eq!(sanitize_file_name("a\\b\\c.jar"), "c.jar");
        assert_eq!(
            sanitize_file_name("divinemc-1.21.4-142.jar"),
            "divinemc-1.21.4-142.jar"
        );
    }

    #[test]
    fn separate_form_fields_fill_the_same_metadata() {
        let mut metadata = api::UploadMetadata::default();
        apply_field(&mut metadata, "buildNumber", "142").unwrap();
        apply_field(&mut metadata, "channel", "BETA").unwrap();
        apply_field(
            &mut metadata,
            "commits",
            r#"[{"sha":"abc","message":"m","time":"2026-01-01T00:00:00Z"}]"#,
        )
        .unwrap();

        assert_eq!(metadata.build_number, Some(142));
        assert_eq!(metadata.channel, Some(api::Channel::Beta));
        assert_eq!(metadata.commits.as_ref().map(Vec::len), Some(1));
        assert!(apply_field(&mut metadata, "buildNumber", "abc").is_err());
    }
}
