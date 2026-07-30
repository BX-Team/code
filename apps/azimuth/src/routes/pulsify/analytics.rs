use analytics::Range;
use axum::Json;
use axum::extract::{Query, State};
use chrono::Duration;
use database::models::pulsify as db;
use util::ApiResult;

use super::overview::RangeQuery;
use crate::auth::project::OwnedProject;
use crate::models::pulsify as api;
use crate::state::AppState;

#[utoipa::path(get, path = "/pulsify/projects/{id}/stats", tag = "pulsify",
    params(("id" = uuid::Uuid, Path, description = "Project id")),
    responses((status = 200, body = api::Stats), (status = 404)))]
pub async fn stats(
    State(state): State<AppState>,
    owned: OwnedProject,
    Query(query): Query<RangeQuery>,
) -> ApiResult<Json<api::Stats>> {
    let range = Range::from_query(query.range.as_deref(), Range::H24);
    let id = owned.project.id;

    let metadata = db::server_metadata_for(&state.db, &[id]).await?;
    let suppressed = db::suppressed_fingerprints(&state.db, &[id]).await?;
    let errors = state
        .analytics
        .open_error_counts(&[id], &suppressed)
        .await?;
    let timeseries = state.analytics.project_timeseries(id, range).await?;

    Ok(Json(api::Stats {
        project: api::StatsProject {
            id,
            name: owned.project.name,
            slug: owned.project.slug,
            kind: owned.project.kind,
        },
        metadata: metadata.first().map(|row| api::Metadata {
            last_seen_at: api::iso(row.last_seen_at),
            software: row.software.clone(),
            mc_version: row.mc_version.clone(),
            country_code: row.country_code.clone(),
        }),
        timeseries: timeseries
            .into_iter()
            .map(|point| api::StatsPoint {
                time: api::iso(point.time),
                online: point.online,
                tps: point.tps,
                mspt: point.mspt,
                memory_used: point.memory_used,
                memory_max: point.memory_max,
            })
            .collect(),
        summary: api::StatsSummary {
            total_errors: errors.get(&id).copied().unwrap_or(0),
        },
        range: range.as_str(),
    }))
}

#[utoipa::path(get, path = "/pulsify/projects/{id}/players", tag = "pulsify",
    params(("id" = uuid::Uuid, Path, description = "Project id")),
    responses((status = 200, body = api::Players), (status = 404)))]
pub async fn players(
    State(state): State<AppState>,
    owned: OwnedProject,
) -> ApiResult<Json<api::Players>> {
    let id = owned.project.id;
    let sessions = state.analytics.recent_sessions(id, 24, 100).await?;
    let totals = state.analytics.player_totals(id, 24).await?;

    Ok(Json(api::Players {
        sessions: sessions
            .into_iter()
            .map(|session| api::PlayerSession {
                // Rows are written when a player leaves, so the join is the end minus the length.
                joined_at: api::iso(
                    session.timestamp - Duration::seconds(i64::from(session.duration_seconds)),
                ),
                player_uuid: session.player_uuid,
                client_version: session.client_version,
                country_code: session.country_code,
            })
            .collect(),
        summary: api::PlayersSummary {
            unique_players: totals.unique_players,
            new_players: totals.new_players,
        },
    }))
}

#[utoipa::path(get, path = "/pulsify/projects/{id}/geography", tag = "pulsify",
    params(("id" = uuid::Uuid, Path, description = "Project id")),
    responses((status = 200, body = api::Geography), (status = 404)))]
pub async fn geography(
    State(state): State<AppState>,
    owned: OwnedProject,
    Query(query): Query<RangeQuery>,
) -> ApiResult<Json<api::Geography>> {
    let range = Range::from_query(query.range.as_deref(), Range::D7);
    let rows = state
        .analytics
        .top_countries(owned.project.id, range)
        .await?;
    let total: u64 = rows.iter().map(|row| row.count).sum();

    Ok(Json(api::Geography {
        countries: rows
            .into_iter()
            .map(|row| api::Country {
                pct: api::percent(row.count, total),
                code: row.label,
                count: row.count,
            })
            .collect(),
        total,
    }))
}

#[utoipa::path(get, path = "/pulsify/projects/{id}/client-versions", tag = "pulsify",
    params(("id" = uuid::Uuid, Path, description = "Project id")),
    responses((status = 200, body = api::ClientVersions), (status = 404)))]
pub async fn client_versions(
    State(state): State<AppState>,
    owned: OwnedProject,
    Query(query): Query<RangeQuery>,
) -> ApiResult<Json<api::ClientVersions>> {
    let range = Range::from_query(query.range.as_deref(), Range::D7);
    let rows = state
        .analytics
        .top_client_versions(owned.project.id, range)
        .await?;
    let total: u64 = rows.iter().map(|row| row.count).sum();

    Ok(Json(api::ClientVersions {
        versions: rows
            .into_iter()
            .map(|row| api::ClientVersion {
                pct: api::percent(row.count, total),
                version: row.label,
                count: row.count,
            })
            .collect(),
        total,
    }))
}

#[utoipa::path(get, path = "/pulsify/projects/{id}/session-duration", tag = "pulsify",
    params(("id" = uuid::Uuid, Path, description = "Project id")),
    responses((status = 200, body = api::SessionDuration), (status = 404)))]
pub async fn session_duration(
    State(state): State<AppState>,
    owned: OwnedProject,
    Query(query): Query<RangeQuery>,
) -> ApiResult<Json<api::SessionDuration>> {
    let range = Range::from_query(query.range.as_deref(), Range::D7);
    let stats = state
        .analytics
        .session_duration(owned.project.id, range)
        .await?;

    let buckets = [
        ("0-5m", stats.under_5m),
        ("5-15m", stats.under_15m),
        ("15-30m", stats.under_30m),
        ("30-60m", stats.under_60m),
        ("60m+", stats.over_60m),
    ];
    let total: u64 = buckets.iter().map(|(_, count)| count).sum();

    Ok(Json(api::SessionDuration {
        avg_seconds: stats.average,
        median_seconds: stats.median,
        total_sessions: total,
        distribution: buckets
            .into_iter()
            .map(|(label, count)| api::Bucket {
                label,
                count,
                pct: api::percent(count, total),
            })
            .collect(),
    }))
}

#[utoipa::path(get, path = "/pulsify/projects/{id}/retention", tag = "pulsify",
    params(("id" = uuid::Uuid, Path, description = "Project id")),
    responses((status = 200, body = api::Retention), (status = 404)))]
pub async fn retention(
    State(state): State<AppState>,
    owned: OwnedProject,
) -> ApiResult<Json<api::Retention>> {
    let retention = state.analytics.retention(owned.project.id).await?;

    Ok(Json(api::Retention {
        d1: api::Cohort {
            cohort: retention.day1_cohort,
            retained: retention.day1_returned,
            pct: api::percent(retention.day1_returned, retention.day1_cohort),
        },
        d7: api::Cohort {
            cohort: retention.day7_cohort,
            retained: retention.day7_returned,
            pct: api::percent(retention.day7_returned, retention.day7_cohort),
        },
    }))
}
