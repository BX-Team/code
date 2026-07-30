use analytics::Range;
use axum::Json;
use axum::extract::{Path, Query, State};
use indexmap::IndexMap;
use util::ApiResult;
use uuid::Uuid;

use super::overview::RangeQuery;
use crate::auth::project::OwnedProject;
use crate::models::pulsify as api;
use crate::state::AppState;

#[utoipa::path(get, path = "/pulsify/projects/{id}/metrics", tag = "pulsify",
    params(("id" = Uuid, Path, description = "Project id")),
    responses((status = 200, body = api::MetricsList), (status = 400), (status = 404)))]
pub async fn list(
    State(state): State<AppState>,
    owned: OwnedProject,
    Query(query): Query<RangeQuery>,
) -> ApiResult<Json<api::MetricsList>> {
    owned.require_installable()?;

    let range = Range::from_query(query.range.as_deref(), Range::H24);
    let summaries = state
        .analytics
        .metric_summaries(owned.project.id, range)
        .await?;

    Ok(Json(api::MetricsList {
        metrics: summaries
            .into_iter()
            .map(|summary| api::MetricSummary {
                name: summary.name,
                total_points: summary.samples,
                max_value: summary.max_value,
                min_value: summary.min_value,
                avg_value: summary.avg_value,
                last_seen_at: api::iso(summary.last_seen),
            })
            .collect(),
        range: range.as_str(),
    }))
}

#[utoipa::path(get, path = "/pulsify/projects/{id}/metrics/{name}", tag = "pulsify",
    params(
        ("id" = Uuid, Path, description = "Project id"),
        ("name" = String, Path, description = "Metric name")
    ),
    responses((status = 200, body = api::MetricSeries), (status = 400), (status = 404)))]
pub async fn detail(
    State(state): State<AppState>,
    owned: OwnedProject,
    Path(path): Path<(Uuid, String)>,
    Query(query): Query<RangeQuery>,
) -> ApiResult<Json<api::MetricSeries>> {
    let (_, name) = path;
    owned.require_installable()?;

    let range = Range::from_query(query.range.as_deref(), Range::H24);
    let series = state
        .analytics
        .metric_series(owned.project.id, &name, range)
        .await?;
    let breakdown = state
        .analytics
        .metric_labels(owned.project.id, &name, range)
        .await?;

    // ClickHouse returns one row per key/value pair; grouping by key is presentation, not maths.
    let mut labels: IndexMap<String, Vec<api::LabelValue>> = IndexMap::new();
    for row in breakdown {
        labels.entry(row.key).or_default().push(api::LabelValue {
            value: row.value,
            total: row.total,
            count: row.samples,
        });
    }

    Ok(Json(api::MetricSeries {
        name,
        range: range.as_str(),
        series: series
            .into_iter()
            .map(|point| api::SeriesPoint {
                time: api::iso(point.time),
                avg: point.avg,
                max: point.max,
                min: point.min,
                count: point.count,
            })
            .collect(),
        labels: labels
            .into_iter()
            .map(|(key, values)| api::LabelBreakdown { key, values })
            .collect(),
    }))
}
