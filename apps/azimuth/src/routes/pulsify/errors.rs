use axum::Json;
use axum::extract::{Query, State};
use chrono::{Duration, Utc};
use database::models::pulsify as db;
use serde::Deserialize;
use types::scrub::scrub;
use util::{ApiError, ApiResult};

use crate::auth::project::OwnedProject;
use crate::models::pulsify as api;
use crate::state::AppState;

const MAX_MUTE_HOURS: i64 = 720;
const CROSS_PAYLOAD_SERVERS: usize = 20;

#[derive(Debug, Deserialize)]
pub struct ListQuery {
    pub status: Option<String>,
    pub sort: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct FingerprintQuery {
    pub fingerprint: String,
}

#[utoipa::path(get, path = "/pulsify/projects/{id}/errors", tag = "pulsify",
    params(("id" = uuid::Uuid, Path, description = "Project id")),
    responses((status = 200, body = api::Errors), (status = 404)))]
pub async fn list(
    State(state): State<AppState>,
    owned: OwnedProject,
    Query(query): Query<ListQuery>,
) -> ApiResult<Json<api::Errors>> {
    let id = owned.project.id;
    let now = Utc::now();

    let groups = state.analytics.error_groups(id).await?;
    let issues = db::issues_of(&state.db, id).await?;

    let mut rows: Vec<api::ErrorRow> = groups
        .into_iter()
        .map(|group| {
            let issue = issues
                .iter()
                .find(|issue| issue.fingerprint == group.fingerprint);

            api::ErrorRow {
                // An expired mute reads as open right away, without waiting for the next event.
                status: issue
                    .map_or("open", |issue| issue.effective_status(now))
                    .to_owned(),
                muted_until: issue
                    .and_then(|issue| issue.muted_until)
                    .filter(|until| *until > now)
                    .map(api::iso),
                resolved_at: issue.and_then(|issue| issue.resolved_at).map(api::iso),
                first_version: issue.and_then(|issue| issue.first_version.clone()),
                last_version: issue.and_then(|issue| issue.last_version.clone()),
                id: group.fingerprint,
                plugin: group.plugin,
                message: group.message,
                // Stacktraces are fetched on demand; a list of them would be megabytes.
                stacktrace: String::new(),
                level: group.level,
                count: group.count,
                first_seen_at: api::iso(group.first_seen),
                last_seen_at: api::iso(group.last_seen),
                server_version: non_empty(group.server_version),
                server_software: non_empty(group.server_software),
                plugin_version: non_empty(group.plugin_version),
            }
        })
        .collect();

    let sort = match query.sort.as_deref() {
        Some("first_seen") => "first_seen",
        Some("events") => "events",
        _ => "last_seen",
    };
    match sort {
        "first_seen" => rows.sort_by(|a, b| b.first_seen_at.cmp(&a.first_seen_at)),
        "events" => rows.sort_by_key(|row| std::cmp::Reverse(row.count)),
        _ => rows.sort_by(|a, b| b.last_seen_at.cmp(&a.last_seen_at)),
    }

    // Counts describe the whole list, so they are taken before the status filter narrows it.
    let counts = api::StatusCounts {
        unresolved: rows.iter().filter(|row| row.status == "open").count(),
        resolved: rows.iter().filter(|row| row.status == "resolved").count(),
        ignored: rows.iter().filter(|row| row.status == "ignored").count(),
        all: rows.len(),
    };

    let status = match query.status.as_deref() {
        Some("resolved") => "resolved",
        Some("ignored") => "ignored",
        Some("all") => "all",
        _ => "unresolved",
    };
    if status != "all" {
        let wanted = if status == "unresolved" {
            "open"
        } else {
            status
        };
        rows.retain(|row| row.status == wanted);
    }

    Ok(Json(api::Errors {
        total: rows.len(),
        errors: rows,
        counts,
        sort: sort.to_owned(),
        status: status.to_owned(),
    }))
}

#[utoipa::path(get, path = "/pulsify/projects/{id}/errors/payload", tag = "pulsify",
    params(("id" = uuid::Uuid, Path, description = "Project id")),
    responses((status = 200, body = api::Payload), (status = 404)))]
pub async fn payload(
    State(state): State<AppState>,
    owned: OwnedProject,
    Query(query): Query<FingerprintQuery>,
) -> ApiResult<Json<api::Payload>> {
    let stored = state
        .storage
        .latest_error_payload(owned.project.id, &query.fingerprint)
        .await
        .map_err(|error| ApiError::internal(error.to_string()))?
        .ok_or_else(|| ApiError::NotFound("No payload stored for this error".into()))?;

    Ok(Json(api::Payload {
        plugin: stored.plugin,
        message: stored.message,
        stacktrace: stored.stacktrace,
        level: stored.level,
        timestamp: stored.timestamp,
    }))
}

#[utoipa::path(get, path = "/pulsify/projects/{id}/errors/versions", tag = "pulsify",
    params(("id" = uuid::Uuid, Path, description = "Project id")),
    responses((status = 200, body = api::VersionStats), (status = 404)))]
pub async fn versions(
    State(state): State<AppState>,
    owned: OwnedProject,
    Query(query): Query<FingerprintQuery>,
) -> ApiResult<Json<api::VersionStats>> {
    let rows = state
        .analytics
        .error_versions(owned.project.id, &query.fingerprint)
        .await?;
    let groups = state.analytics.error_groups(owned.project.id).await?;
    let group = groups
        .iter()
        .find(|group| group.fingerprint == query.fingerprint);

    let (first_seen, last_seen) = group.map_or_else(
        || (Utc::now(), Utc::now()),
        |group| (group.first_seen, group.last_seen),
    );

    Ok(Json(api::VersionStats {
        versions: rows
            .into_iter()
            .map(|row| api::VersionStat {
                version: non_empty(row.label),
                count: row.count,
                first_seen: api::iso(first_seen),
                last_seen: api::iso(last_seen),
            })
            .collect(),
    }))
}

#[utoipa::path(post, path = "/pulsify/projects/{id}/errors/status", tag = "pulsify",
    params(("id" = uuid::Uuid, Path, description = "Project id")),
    request_body = api::IssueAction,
    responses((status = 204), (status = 400), (status = 404)))]
pub async fn set_status(
    State(state): State<AppState>,
    owned: OwnedProject,
    Json(body): Json<api::IssueAction>,
) -> ApiResult<axum::http::StatusCode> {
    let existing = db::find_issue(&state.db, owned.project.id, &body.fingerprint).await?;

    let (status, status_version, muted_until) = match body.action.as_str() {
        // The version it was fixed in becomes the baseline a regression is measured against.
        "resolve" => (
            "resolved",
            existing
                .as_ref()
                .and_then(|issue| issue.last_version.clone()),
            None,
        ),
        "ignore" => ("ignored", None, None),
        "mute" => {
            let hours = body.hours.unwrap_or(24).clamp(1, MAX_MUTE_HOURS);
            ("muted", None, Some(Utc::now() + Duration::hours(hours)))
        }
        "reopen" => ("open", None, None),
        other => {
            return Err(ApiError::BadRequest(format!(
                "action must be resolve, ignore, mute or reopen, not {other}"
            )));
        }
    };

    db::set_issue_status(
        &state.db,
        owned.project.id,
        &body.fingerprint,
        status,
        status_version.as_deref(),
        muted_until,
        (status == "resolved").then_some(owned.user.id),
    )
    .await?;

    Ok(axum::http::StatusCode::NO_CONTENT)
}

#[utoipa::path(get, path = "/pulsify/projects/{id}/cross-errors", tag = "pulsify",
    params(("id" = uuid::Uuid, Path, description = "Project id")),
    responses((status = 200, body = api::CrossErrors), (status = 400), (status = 404)))]
pub async fn cross_errors(
    State(state): State<AppState>,
    owned: OwnedProject,
) -> ApiResult<Json<api::CrossErrors>> {
    owned.require_installable()?;

    let installs = db::installations_of(&state.db, owned.project.id).await?;
    let sharing = db::sharing_servers(&state.db, owned.project.id).await?;

    // Unverified projects get an empty result, not an error: anyone could register a project
    // called EssentialsX and start collecting somebody else's crashes.
    if !owned.project.verified {
        return Ok(Json(api::CrossErrors {
            errors: Vec::new(),
            total: 0,
            total_servers: installs.len(),
            sharing_servers: sharing.len(),
            verified: false,
        }));
    }

    let groups = state
        .analytics
        .cross_error_groups(&sharing, &owned.project.name)
        .await?;

    let errors: Vec<api::CrossError> = groups
        .into_iter()
        .map(|group| api::CrossError {
            id: group.fingerprint,
            // Scrubbed again on the way out: historical rows predate ingest-time scrubbing.
            message: scrub(&group.message),
            stacktrace: String::new(),
            level: group.level,
            count: group.count,
            server_count: group.servers,
            first_seen_at: api::iso(group.first_seen),
            last_seen_at: api::iso(group.last_seen),
        })
        .collect();

    Ok(Json(api::CrossErrors {
        total: errors.len(),
        errors,
        total_servers: installs.len(),
        sharing_servers: sharing.len(),
        verified: true,
    }))
}

#[utoipa::path(get, path = "/pulsify/projects/{id}/cross-errors/payload", tag = "pulsify",
    params(("id" = uuid::Uuid, Path, description = "Project id")),
    responses((status = 200, body = api::Payload), (status = 400), (status = 404)))]
pub async fn cross_payload(
    State(state): State<AppState>,
    owned: OwnedProject,
    Query(query): Query<FingerprintQuery>,
) -> ApiResult<Json<api::Payload>> {
    owned.require_installable()?;

    if !owned.project.verified {
        return Err(ApiError::Forbidden("Project is not verified".into()));
    }

    let sharing = db::sharing_servers(&state.db, owned.project.id).await?;
    let mut newest: Option<storage::error_payloads::ErrorPayload> = None;

    for server in sharing.iter().take(CROSS_PAYLOAD_SERVERS) {
        let found = state
            .storage
            .latest_error_payload(*server, &query.fingerprint)
            .await
            .map_err(|error| ApiError::internal(error.to_string()))?;

        if let Some(candidate) = found
            && newest
                .as_ref()
                .is_none_or(|current| candidate.timestamp > current.timestamp)
        {
            newest = Some(candidate);
        }
    }

    let stored = newest.ok_or_else(|| ApiError::NotFound("No payload stored".into()))?;

    Ok(Json(api::Payload {
        plugin: stored.plugin,
        message: scrub(&stored.message),
        stacktrace: scrub(&stored.stacktrace),
        level: stored.level,
        timestamp: stored.timestamp,
    }))
}

fn non_empty(value: String) -> Option<String> {
    (!value.is_empty()).then_some(value)
}
