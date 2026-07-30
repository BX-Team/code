use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::{Json, response::IntoResponse};
use database::models::pulsify as db;
use serde::Deserialize;
use util::{ApiError, ApiResult};
use uuid::Uuid;

use crate::auth::project::OwnedProject;
use crate::auth::session::Session;
use crate::models::pulsify as api;
use crate::state::AppState;

const MAX_SLUG: usize = 64;
const MAX_DESCRIPTION: usize = 256;

#[derive(Debug, Deserialize)]
pub struct OwnerQuery {
    pub owner: Option<Uuid>,
}

#[utoipa::path(get, path = "/pulsify/projects", tag = "pulsify",
    responses((status = 200, body = Vec<api::Project>)))]
pub async fn list(
    State(state): State<AppState>,
    session: Session,
    Query(query): Query<OwnerQuery>,
) -> ApiResult<Json<Vec<api::Project>>> {
    let owner = match query.owner {
        Some(owner) if owner != session.user.id => {
            if !session.user.is_admin() {
                return Err(ApiError::Forbidden("Forbidden".into()));
            }
            owner
        }
        _ => session.user.id,
    };

    let projects = db::projects_of(&state.db, owner).await?;
    let ids: Vec<Uuid> = projects.iter().map(|project| project.id).collect();

    let metadata = db::server_metadata_for(&state.db, &ids).await?;
    let suppressed = db::suppressed_fingerprints(&state.db, &ids).await?;
    let errors = state.analytics.open_error_counts(&ids, &suppressed).await?;

    Ok(Json(
        projects
            .into_iter()
            .map(|project| {
                let last_seen = metadata
                    .iter()
                    .find(|row| row.project_id == project.id)
                    .map(|row| api::iso(row.last_seen_at));

                api::Project {
                    errors: errors.get(&project.id).copied().unwrap_or(0),
                    id: project.id,
                    name: project.name,
                    slug: project.slug,
                    kind: project.kind,
                    description: project.description,
                    verified: project.verified,
                    created_at: api::iso(project.created_at),
                    last_seen_at: last_seen,
                }
            })
            .collect(),
    ))
}

#[utoipa::path(post, path = "/pulsify/projects", tag = "pulsify",
    request_body = api::CreateProject,
    responses((status = 201, body = api::Project), (status = 403), (status = 409)))]
pub async fn create(
    State(state): State<AppState>,
    session: Session,
    Json(body): Json<api::CreateProject>,
) -> ApiResult<(StatusCode, Json<api::Project>)> {
    let name = body.name.trim();
    let slug = body.slug.trim();

    if name.is_empty() || name.chars().count() > MAX_SLUG {
        return Err(ApiError::BadRequest("name must be 1..64 characters".into()));
    }
    if slug.is_empty()
        || slug.len() > MAX_SLUG
        || !slug
            .bytes()
            .all(|byte| byte.is_ascii_lowercase() || byte.is_ascii_digit() || byte == b'-')
    {
        return Err(ApiError::BadRequest(
            "slug must match /^[a-z0-9-]+$/ and be 1..64 characters".into(),
        ));
    }
    if !matches!(body.kind.as_str(), "server" | "plugin" | "mod") {
        return Err(ApiError::BadRequest(
            "type must be server, plugin or mod".into(),
        ));
    }
    if body
        .description
        .as_ref()
        .is_some_and(|value| value.chars().count() > MAX_DESCRIPTION)
    {
        return Err(ApiError::BadRequest(
            "description must be at most 256 characters".into(),
        ));
    }

    let quota = db::quota(&state.db, session.user.id).await?;
    if db::count_projects(&state.db, session.user.id).await? >= i64::from(quota.max_projects) {
        return Err(ApiError::Forbidden(format!(
            "Project limit of {} reached",
            quota.max_projects
        )));
    }

    let project = db::create_project(
        &state.db,
        session.user.id,
        name,
        slug,
        &body.kind,
        body.description.as_deref().map(str::trim),
    )
    .await
    .map_err(|error| match error {
        // Both the slug and the global plugin name are unique; either is a conflict, not a 500.
        database::Error::Database(ref inner) if inner.is_unique_violation() => {
            ApiError::Conflict("A project with this name or slug already exists".into())
        }
        other => ApiError::Database(other),
    })?;

    Ok((
        StatusCode::CREATED,
        Json(api::Project {
            id: project.id,
            name: project.name,
            slug: project.slug,
            kind: project.kind,
            description: project.description,
            verified: project.verified,
            created_at: api::iso(project.created_at),
            last_seen_at: None,
            errors: 0,
        }),
    ))
}

#[utoipa::path(delete, path = "/pulsify/projects/{id}", tag = "pulsify",
    params(("id" = Uuid, Path, description = "Project id")),
    responses((status = 204), (status = 404)))]
pub async fn delete(
    State(state): State<AppState>,
    owned: OwnedProject,
) -> ApiResult<impl IntoResponse> {
    db::delete_project(&state.db, owned.project.id, owned.user.id).await?;
    Ok(StatusCode::NO_CONTENT)
}

#[derive(Debug, serde::Serialize, utoipa::ToSchema)]
pub struct Verified {
    pub id: Uuid,
    pub verified: bool,
}

/// Verification is what unlocks cross-server aggregation, so only an admin may grant it.
#[utoipa::path(patch, path = "/pulsify/projects/{id}/verify", tag = "pulsify",
    params(("id" = Uuid, Path, description = "Project id")),
    request_body = api::SetVerified,
    responses((status = 200, body = Verified), (status = 403), (status = 404)))]
pub async fn verify(
    State(state): State<AppState>,
    _admin: crate::auth::session::AdminSession,
    Path(id): Path<Uuid>,
    Json(body): Json<api::SetVerified>,
) -> ApiResult<Json<Verified>> {
    if !db::set_verified(&state.db, id, body.verified).await? {
        return Err(ApiError::NotFound("Project not found".into()));
    }

    Ok(Json(Verified {
        id,
        verified: body.verified,
    }))
}

#[utoipa::path(get, path = "/pulsify/projects/{id}/plugins", tag = "pulsify",
    params(("id" = Uuid, Path, description = "Project id")),
    responses((status = 200, body = api::PluginInsights), (status = 400), (status = 404)))]
pub async fn plugins(
    State(state): State<AppState>,
    owned: OwnedProject,
) -> ApiResult<Json<api::PluginInsights>> {
    owned.require_installable()?;

    let installations = db::installations_of(&state.db, owned.project.id).await?;
    let total = installations.len() as u64;
    let enabled = installations.iter().filter(|row| row.enabled).count() as u64;

    let mut by_version: std::collections::HashMap<String, u64> = std::collections::HashMap::new();
    for installation in &installations {
        *by_version.entry(installation.version.clone()).or_default() += 1;
    }

    let mut versions: Vec<api::VersionShare> = by_version
        .into_iter()
        .map(|(version, count)| api::VersionShare {
            version,
            count,
            pct: api::percent(count, total),
        })
        .collect();
    versions.sort_by(|a, b| {
        b.count
            .cmp(&a.count)
            .then_with(|| a.version.cmp(&b.version))
    });

    // The most installed version, not the newest one: adoption is what this page is about.
    let latest = versions.first();

    Ok(Json(api::PluginInsights {
        total_installs: total,
        enabled_installs: enabled,
        latest_version: latest.map(|share| share.version.clone()),
        latest_version_adoption: latest.map_or(0.0, |share| share.pct),
        versions,
    }))
}

#[utoipa::path(get, path = "/pulsify/projects/{id}/installations", tag = "pulsify",
    params(("id" = Uuid, Path, description = "Project id")),
    responses((status = 200, body = api::Installations), (status = 400), (status = 404)))]
pub async fn installations(
    State(state): State<AppState>,
    owned: OwnedProject,
) -> ApiResult<Json<api::Installations>> {
    owned.require_server()?;

    let rows = db::installations_on(&state.db, owned.project.id).await?;

    Ok(Json(api::Installations {
        installations: rows
            .into_iter()
            .map(|row| api::Installation {
                plugin_id: row.plugin_id,
                name: row.name,
                slug: row.slug,
                version: row.version,
                enabled: row.enabled,
                share_errors: row.share_errors,
                last_seen_at: api::iso(row.last_seen_at),
            })
            .collect(),
    }))
}

/// Lets a server owner stop sharing one plugin's errors with its author.
#[utoipa::path(patch, path = "/pulsify/projects/{id}/installations/{plugin_id}", tag = "pulsify",
    params(
        ("id" = Uuid, Path, description = "Server project id"),
        ("plugin_id" = Uuid, Path, description = "Installed plugin project id")
    ),
    request_body = api::SetShareErrors,
    responses((status = 204), (status = 404)))]
pub async fn set_share_errors(
    State(state): State<AppState>,
    owned: OwnedProject,
    Path(path): Path<(Uuid, Uuid)>,
    Json(body): Json<api::SetShareErrors>,
) -> ApiResult<impl IntoResponse> {
    let (_, plugin_id) = path;
    owned.require_server()?;

    if !db::set_share_errors(&state.db, owned.project.id, plugin_id, body.share_errors).await? {
        return Err(ApiError::NotFound("Installation not found".into()));
    }

    Ok(StatusCode::NO_CONTENT)
}
