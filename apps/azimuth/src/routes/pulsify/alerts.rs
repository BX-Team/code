use axum::Json;
use axum::extract::{Path, State};
use axum::http::StatusCode;
use database::models::pulsify as db;
use util::{ApiError, ApiResult};
use uuid::Uuid;

use crate::auth::project::OwnedProject;
use crate::models::pulsify as api;
use crate::state::AppState;

const MAX_RULES: i64 = 20;
const MAX_WEBHOOK_URL: usize = 512;

fn present(rule: db::AlertRule) -> api::AlertRule {
    api::AlertRule {
        id: rule.id,
        kind: rule.kind,
        enabled: rule.enabled,
        threshold: rule.threshold,
        window_minutes: rule.window_minutes,
        webhook_url: rule.webhook_url,
        last_fired_at: rule.last_fired_at.map(api::iso),
        created_at: api::iso(rule.created_at),
    }
}

#[utoipa::path(get, path = "/pulsify/projects/{id}/alerts", tag = "pulsify",
    params(("id" = Uuid, Path, description = "Project id")),
    responses((status = 200, body = api::AlertRules), (status = 404)))]
pub async fn list(
    State(state): State<AppState>,
    owned: OwnedProject,
) -> ApiResult<Json<api::AlertRules>> {
    let rules = db::alert_rules_of(&state.db, owned.project.id).await?;

    Ok(Json(api::AlertRules {
        rules: rules.into_iter().map(present).collect(),
    }))
}

#[utoipa::path(post, path = "/pulsify/projects/{id}/alerts", tag = "pulsify",
    params(("id" = Uuid, Path, description = "Project id")),
    request_body = api::CreateAlertRule,
    responses((status = 201, body = api::AlertRule), (status = 400), (status = 403)))]
pub async fn create(
    State(state): State<AppState>,
    owned: OwnedProject,
    Json(body): Json<api::CreateAlertRule>,
) -> ApiResult<(StatusCode, Json<api::AlertRule>)> {
    if !matches!(
        body.kind.as_str(),
        "new_issue" | "regression" | "error_spike"
    ) {
        return Err(ApiError::BadRequest(
            "type must be new_issue, regression or error_spike".into(),
        ));
    }
    validate_webhook(&body.webhook_url)?;

    let threshold = body.threshold.unwrap_or(10);
    let window = body.window_minutes.unwrap_or(5);
    if !(1..=1_000_000).contains(&threshold) {
        return Err(ApiError::BadRequest("threshold must be 1..1000000".into()));
    }
    if !(1..=1440).contains(&window) {
        return Err(ApiError::BadRequest("windowMinutes must be 1..1440".into()));
    }

    if db::count_alert_rules(&state.db, owned.project.id).await? >= MAX_RULES {
        return Err(ApiError::Forbidden(format!(
            "A project may have at most {MAX_RULES} alert rules"
        )));
    }

    let rule = db::create_alert_rule(
        &state.db,
        owned.project.id,
        &body.kind,
        body.webhook_url.trim(),
        threshold,
        window,
    )
    .await?;

    Ok((StatusCode::CREATED, Json(present(rule))))
}

#[utoipa::path(patch, path = "/pulsify/projects/{id}/alerts/{alert_id}", tag = "pulsify",
    params(
        ("id" = Uuid, Path, description = "Project id"),
        ("alert_id" = Uuid, Path, description = "Alert rule id")
    ),
    request_body = api::UpdateAlertRule,
    responses((status = 200, body = api::AlertRule), (status = 400), (status = 404)))]
pub async fn update(
    State(state): State<AppState>,
    owned: OwnedProject,
    Path(path): Path<(Uuid, Uuid)>,
    Json(body): Json<api::UpdateAlertRule>,
) -> ApiResult<Json<api::AlertRule>> {
    let (_, alert_id) = path;
    if let Some(url) = &body.webhook_url {
        validate_webhook(url)?;
    }
    if body
        .threshold
        .is_some_and(|value| !(1..=1_000_000).contains(&value))
    {
        return Err(ApiError::BadRequest("threshold must be 1..1000000".into()));
    }
    if body
        .window_minutes
        .is_some_and(|value| !(1..=1440).contains(&value))
    {
        return Err(ApiError::BadRequest("windowMinutes must be 1..1440".into()));
    }

    let rule = db::update_alert_rule(
        &state.db,
        owned.project.id,
        alert_id,
        body.enabled,
        body.threshold,
        body.window_minutes,
        body.webhook_url.as_deref().map(str::trim),
    )
    .await?
    .ok_or_else(|| ApiError::NotFound("Alert rule not found".into()))?;

    Ok(Json(present(rule)))
}

#[utoipa::path(delete, path = "/pulsify/projects/{id}/alerts/{alert_id}", tag = "pulsify",
    params(
        ("id" = Uuid, Path, description = "Project id"),
        ("alert_id" = Uuid, Path, description = "Alert rule id")
    ),
    responses((status = 204), (status = 404)))]
pub async fn delete(
    State(state): State<AppState>,
    owned: OwnedProject,
    Path(path): Path<(Uuid, Uuid)>,
) -> ApiResult<StatusCode> {
    let (_, alert_id) = path;
    if !db::delete_alert_rule(&state.db, owned.project.id, alert_id).await? {
        return Err(ApiError::NotFound("Alert rule not found".into()));
    }

    Ok(StatusCode::NO_CONTENT)
}

/// Webhooks are called by the server, so the URL is an SSRF surface: HTTPS only.
fn validate_webhook(url: &str) -> ApiResult<()> {
    let url = url.trim();
    if url.len() > MAX_WEBHOOK_URL {
        return Err(ApiError::BadRequest(
            "webhookUrl must be at most 512 characters".into(),
        ));
    }

    let parsed = url::Url::parse(url)
        .map_err(|_| ApiError::BadRequest("webhookUrl must be a valid URL".into()))?;

    if parsed.scheme() != "https" {
        return Err(ApiError::BadRequest("webhookUrl must be https".into()));
    }

    let host = parsed
        .host_str()
        .ok_or_else(|| ApiError::BadRequest("webhookUrl must have a host".into()))?;

    if is_local(host) {
        return Err(ApiError::BadRequest(
            "webhookUrl must not point at a private address".into(),
        ));
    }

    Ok(())
}

fn is_local(host: &str) -> bool {
    if host.eq_ignore_ascii_case("localhost") || host.ends_with(".localhost") {
        return true;
    }

    match host.trim_start_matches('[').trim_end_matches(']').parse() {
        Ok(std::net::IpAddr::V4(v4)) => {
            v4.is_private() || v4.is_loopback() || v4.is_link_local() || v4.is_unspecified()
        }
        Ok(std::net::IpAddr::V6(v6)) => {
            v6.is_loopback()
                || v6.is_unspecified()
                || matches!(v6.segments()[0] & 0xfe00, 0xfc00)
                || matches!(v6.segments()[0] & 0xffc0, 0xfe80)
        }
        Err(_) => false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn only_public_https_webhooks_are_accepted() {
        assert!(validate_webhook("https://discord.com/api/webhooks/1/abc").is_ok());
        assert!(validate_webhook("https://example.com/hook").is_ok());

        assert!(validate_webhook("http://example.com/hook").is_err());
        assert!(validate_webhook("ftp://example.com/hook").is_err());
        assert!(validate_webhook("not a url").is_err());
        assert!(validate_webhook("https://localhost/hook").is_err());
        assert!(validate_webhook("https://127.0.0.1/hook").is_err());
        assert!(validate_webhook("https://10.0.0.1/hook").is_err());
        assert!(validate_webhook("https://192.168.1.1/hook").is_err());
        assert!(validate_webhook("https://169.254.169.254/latest/meta-data").is_err());
        assert!(validate_webhook("https://[::1]/hook").is_err());
        assert!(validate_webhook(&format!("https://example.com/{}", "a".repeat(600))).is_err());
    }
}
