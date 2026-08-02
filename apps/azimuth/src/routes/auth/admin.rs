use axum::Json;
use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use chrono::{Duration, Utc};
use database::models::auth;
use mail::{Action, Announcement};
use serde::{Deserialize, Serialize};
use util::{ApiError, ApiResult};
use utoipa::ToSchema;
use uuid::Uuid;

use super::{SessionUser, present};
use crate::auth::session::AdminSession;
use crate::state::AppState;

const MAX_LIMIT: i64 = 200;
const MAX_SUBJECT: usize = 200;
const MAX_BODY: usize = 20_000;
const BAN_EXPIRY_FORMAT: &str = "%-d %B %Y, %H:%M UTC";

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

#[derive(Debug, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct SendMail {
    pub template: Template,
    pub subject: String,
    pub heading: Option<String>,
    pub body: String,
    pub action_label: Option<String>,
    pub action_url: Option<String>,
}

#[derive(Debug, Deserialize, ToSchema)]
#[serde(rename_all = "lowercase")]
pub enum Template {
    Announcement,
    Plain,
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
    let search = trimmed(query.search_value.as_deref());

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

    let user = auth::user(&state.db, id)
        .await?
        .ok_or_else(|| ApiError::NotFound("User not found".into()))?;

    let expires = body
        .ban_expires_in
        .filter(|seconds| *seconds > 0)
        .map(|seconds| Utc::now() + Duration::seconds(seconds));

    let reason = trimmed(body.ban_reason.as_deref());
    auth::set_ban(&state.db, id, true, reason, expires).await?;

    let until = expires.map(|at| at.format(BAN_EXPIRY_FORMAT).to_string());
    notify(
        state
            .mailer
            .send_ban_notice(&user.email, &user.name, reason, until.as_deref())
            .await,
    );

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

    let user = auth::user(&state.db, id)
        .await?
        .ok_or_else(|| ApiError::NotFound("User not found".into()))?;

    auth::delete_user(&state.db, id).await?;
    notify(
        state
            .mailer
            .send_account_deleted(&user.email, &user.name)
            .await,
    );

    Ok(StatusCode::NO_CONTENT)
}

#[utoipa::path(post, path = "/auth/admin/users/{id}/mail", tag = "auth",
    params(("id" = Uuid, Path, description = "User id")),
    request_body = SendMail,
    responses((status = 204), (status = 400), (status = 403), (status = 404), (status = 503)))]
pub async fn send_mail(
    State(state): State<AppState>,
    _admin: AdminSession,
    Path(id): Path<Uuid>,
    Json(body): Json<SendMail>,
) -> ApiResult<StatusCode> {
    let user = auth::user(&state.db, id)
        .await?
        .ok_or_else(|| ApiError::NotFound("User not found".into()))?;

    let subject = trimmed(Some(&body.subject))
        .ok_or_else(|| ApiError::BadRequest("Subject is required".into()))?;
    let message = trimmed(Some(&body.body))
        .ok_or_else(|| ApiError::BadRequest("Message is required".into()))?;

    if subject.chars().count() > MAX_SUBJECT || message.chars().count() > MAX_BODY {
        return Err(ApiError::BadRequest("Message is too long".into()));
    }

    let sent = match body.template {
        Template::Plain => {
            state
                .mailer
                .send_text(&user.email, subject, message.to_owned())
                .await
        }
        Template::Announcement => {
            let action = match (
                trimmed(body.action_label.as_deref()),
                trimmed(body.action_url.as_deref()),
            ) {
                (Some(label), Some(href)) => {
                    if !href.starts_with("https://") && !href.starts_with("http://") {
                        return Err(ApiError::BadRequest(
                            "Action link must be an http(s) URL".into(),
                        ));
                    }
                    Some(Action { label, href })
                }
                _ => None,
            };

            state
                .mailer
                .send_announcement(
                    &user.email,
                    &Announcement {
                        subject,
                        heading: trimmed(body.heading.as_deref()).unwrap_or(subject),
                        body: message,
                        action,
                    },
                )
                .await
        }
    };

    sent.map_err(|error| {
        tracing::error!(%error, "could not send admin mail");
        ApiError::ServiceUnavailable("Could not send the email".into())
    })?;

    Ok(StatusCode::NO_CONTENT)
}

fn trimmed(value: Option<&str>) -> Option<&str> {
    value.map(str::trim).filter(|value| !value.is_empty())
}

/// The moderation action has already landed by the time its notice goes out, so an undeliverable
/// mailbox must not turn a completed ban or deletion into a failed request.
fn notify(result: Result<(), mail::Error>) {
    if let Err(error) = result {
        tracing::warn!(%error, "could not notify the user about a moderation action");
    }
}
