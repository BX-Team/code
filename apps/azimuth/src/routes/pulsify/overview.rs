use analytics::Range;
use axum::Json;
use axum::extract::{Query, State};
use database::models::pulsify as db;
use serde::Deserialize;
use util::ApiResult;
use uuid::Uuid;

use crate::auth::session::Session;
use crate::models::pulsify as api;
use crate::state::AppState;

#[derive(Debug, Deserialize)]
pub struct RangeQuery {
    pub range: Option<String>,
}

#[utoipa::path(get, path = "/pulsify/overview", tag = "pulsify",
    params(("range" = Option<String>, Query, description = "24h, 7d or 30d")),
    responses((status = 200, body = api::Overview)))]
pub async fn overview(
    State(state): State<AppState>,
    session: Session,
    Query(query): Query<RangeQuery>,
) -> ApiResult<Json<api::Overview>> {
    let range = Range::from_query(query.range.as_deref(), Range::D7);

    let projects = db::projects_of(&state.db, session.user.id).await?;
    let ids: Vec<Uuid> = projects.iter().map(|project| project.id).collect();
    let server_ids: Vec<Uuid> = projects
        .iter()
        .filter(|project| project.kind == "server")
        .map(|project| project.id)
        .collect();

    let metadata = db::server_metadata_for(&state.db, &ids).await?;
    let suppressed = db::suppressed_fingerprints(&state.db, &ids).await?;
    let errors = state.analytics.open_error_counts(&ids, &suppressed).await?;

    // The headline numbers are always the last 24 hours; `range` only widens the chart.
    let total_events = state.analytics.event_count(&ids, 24).await?;
    let peak = state.analytics.project_peak(&server_ids, 24).await?;
    let timeseries = state
        .analytics
        .server_timeseries(&server_ids, range)
        .await?;

    let summary = api::OverviewSummary {
        projects: projects.len(),
        servers: server_ids.len(),
        plugins: projects.iter().filter(|p| p.kind == "plugin").count(),
        mods: projects.iter().filter(|p| p.kind == "mod").count(),
        total_errors: errors.values().sum(),
        total_events24h: total_events,
        peak_online24h: peak.peak_online,
        unique_players24h: peak.unique_players,
    };

    Ok(Json(api::Overview {
        summary,
        timeseries: timeseries
            .into_iter()
            .map(|point| api::OverviewPoint {
                time: api::iso(point.time),
                online: point.online,
                tps: point.tps,
            })
            .collect(),
        projects: projects
            .into_iter()
            .map(|project| {
                let row = metadata.iter().find(|row| row.project_id == project.id);
                api::OverviewProject {
                    errors: errors.get(&project.id).copied().unwrap_or(0),
                    last_seen_at: row.map(|row| api::iso(row.last_seen_at)),
                    software: row.and_then(|row| row.software.clone()),
                    mc_version: row.and_then(|row| row.mc_version.clone()),
                    id: project.id,
                    name: project.name,
                    slug: project.slug,
                    kind: project.kind,
                }
            })
            .collect(),
        range: range.as_str(),
    }))
}

#[utoipa::path(get, path = "/pulsify/billing", tag = "pulsify",
    responses((status = 200, body = api::Billing)))]
pub async fn billing(
    State(state): State<AppState>,
    session: Session,
) -> ApiResult<Json<api::Billing>> {
    let quota = db::quota(&state.db, session.user.id).await?;

    Ok(Json(api::Billing {
        plan: "free",
        limits: api::Limits {
            max_projects: quota.max_projects,
            max_events_per_day: quota.max_events_per_day,
        },
        usage: api::Usage {
            projects: db::count_projects(&state.db, session.user.id).await?,
            events_today: db::events_today(&state.db, session.user.id).await?.max(0) as u64,
        },
    }))
}
