use axum::Json;
use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use chrono::{Duration, Utc};
use database::models::auth;
use serde::{Deserialize, Serialize};
use util::{ApiError, ApiResult};
use utoipa::ToSchema;
use uuid::Uuid;

use super::{SessionUser, present};
use crate::auth::session::AdminSession;
use crate::state::AppState;

const MAX_LIMIT: i64 = 200;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListQuery {
    pub limit: Option<i64>,
    pub offset: Option<i64>,
    pub search_value: Option<String>,
    pub filter_value: Option<bool>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct UserList {
    pub users: Vec<SessionUser>,
    pub total: i64,
}

#[derive(Debug, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct BanUser {
    pub ban_reason: Option<String>,
    pub ban_expires_in: Option<i64>,
}

#[utoipa::path(get, path = "/auth/admin/users", tag = "auth",
    responses((status = 200, body = UserList), (status = 403)))]
pub async fn list_users(
    State(state): State<AppState>,
    _admin: AdminSession,
    Query(query): Query<ListQuery>,
) -> ApiResult<Json<UserList>> {
    let limit = query.limit.unwrap_or(20).clamp(1, MAX_LIMIT);
    let offset = query.offset.unwrap_or(0).max(0);
    let search = query
        .search_value
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty());

    let users = auth::list_users(&state.db, search, query.filter_value, limit, offset).await?;
    let total = auth::count_users(&state.db, search, query.filter_value).await?;

    Ok(Json(UserList {
        users: users.into_iter().map(present).collect(),
        total,
    }))
}

#[utoipa::path(post, path = "/auth/admin/users/{id}/ban", tag = "auth",
    params(("id" = Uuid, Path, description = "User id")),
    request_body = BanUser,
    responses((status = 204), (status = 403), (status = 404)))]
pub async fn ban(
    State(state): State<AppState>,
    admin: AdminSession,
    Path(id): Path<Uuid>,
    Json(body): Json<BanUser>,
) -> ApiResult<StatusCode> {
    if id == admin.user.id {
        return Err(ApiError::BadRequest("You cannot ban yourself".into()));
    }

    let expires = body
        .ban_expires_in
        .filter(|seconds| *seconds > 0)
        .map(|seconds| Utc::now() + Duration::seconds(seconds));

    let reason = body
        .ban_reason
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty());

    if !auth::set_ban(&state.db, id, true, reason, expires).await? {
        return Err(ApiError::NotFound("User not found".into()));
    }

    Ok(StatusCode::NO_CONTENT)
}

#[utoipa::path(post, path = "/auth/admin/users/{id}/unban", tag = "auth",
    params(("id" = Uuid, Path, description = "User id")),
    responses((status = 204), (status = 403), (status = 404)))]
pub async fn unban(
    State(state): State<AppState>,
    _admin: AdminSession,
    Path(id): Path<Uuid>,
) -> ApiResult<StatusCode> {
    if !auth::set_ban(&state.db, id, false, None, None).await? {
        return Err(ApiError::NotFound("User not found".into()));
    }

    Ok(StatusCode::NO_CONTENT)
}

#[utoipa::path(delete, path = "/auth/admin/users/{id}", tag = "auth",
    params(("id" = Uuid, Path, description = "User id")),
    responses((status = 204), (status = 403), (status = 404)))]
pub async fn remove(
    State(state): State<AppState>,
    admin: AdminSession,
    Path(id): Path<Uuid>,
) -> ApiResult<StatusCode> {
    if id == admin.user.id {
        return Err(ApiError::BadRequest("You cannot delete yourself".into()));
    }

    if !auth::delete_user(&state.db, id).await? {
        return Err(ApiError::NotFound("User not found".into()));
    }

    Ok(StatusCode::NO_CONTENT)
}
