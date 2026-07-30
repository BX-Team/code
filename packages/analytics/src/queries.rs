use std::collections::BTreeMap;

use chrono::{DateTime, Utc};
use clickhouse::Row;
use serde::Deserialize;
use uuid::Uuid;

use crate::{Analytics, Error, Range};

#[derive(Debug, Clone, Row, Deserialize)]
pub struct TimePoint {
    #[serde(with = "clickhouse::serde::chrono::datetime64::millis")]
    pub time: DateTime<Utc>,
    pub online: f64,
    pub tps: f64,
}

#[derive(Debug, Clone, Row, Deserialize)]
pub struct ProjectPoint {
    #[serde(with = "clickhouse::serde::chrono::datetime64::millis")]
    pub time: DateTime<Utc>,
    pub online: f64,
    pub tps: f64,
    pub mspt: f64,
    pub memory_used: f64,
    pub memory_max: f64,
}

#[derive(Debug, Clone, Row, Deserialize)]
pub struct FingerprintCount {
    pub fingerprint: String,
    pub count: u64,
}

#[derive(Debug, Clone, Row, Deserialize)]
pub struct ErrorGroup {
    pub fingerprint: String,
    pub plugin: String,
    pub level: String,
    pub message: String,
    pub server_version: String,
    pub server_software: String,
    pub plugin_version: String,
    pub count: u64,
    #[serde(with = "clickhouse::serde::chrono::datetime64::millis")]
    pub first_seen: DateTime<Utc>,
    #[serde(with = "clickhouse::serde::chrono::datetime64::millis")]
    pub last_seen: DateTime<Utc>,
}

#[derive(Debug, Clone, Row, Deserialize)]
pub struct CrossErrorGroup {
    pub fingerprint: String,
    pub level: String,
    pub message: String,
    pub plugin_version: String,
    pub count: u64,
    pub servers: u64,
    #[serde(with = "clickhouse::serde::chrono::datetime64::millis")]
    pub first_seen: DateTime<Utc>,
    #[serde(with = "clickhouse::serde::chrono::datetime64::millis")]
    pub last_seen: DateTime<Utc>,
}

#[derive(Debug, Clone, Row, Deserialize)]
pub struct LabelledCount {
    pub label: String,
    pub count: u64,
}

#[derive(Debug, Clone, Row, Deserialize)]
pub struct Session {
    #[serde(with = "clickhouse::serde::chrono::datetime64::millis")]
    pub timestamp: DateTime<Utc>,
    #[serde(with = "clickhouse::serde::uuid")]
    pub player_uuid: Uuid,
    pub client_version: String,
    pub country_code: String,
    pub duration_seconds: u32,
}

#[derive(Debug, Clone, Copy, Row, Deserialize, Default)]
pub struct SessionDuration {
    pub average: f64,
    pub median: f64,
    pub under_5m: u64,
    pub under_15m: u64,
    pub under_30m: u64,
    pub under_60m: u64,
    pub over_60m: u64,
}

#[derive(Debug, Clone, Copy, Row, Deserialize, Default)]
pub struct Retention {
    pub day1_cohort: u64,
    pub day1_returned: u64,
    pub day7_cohort: u64,
    pub day7_returned: u64,
}

#[derive(Debug, Clone, Copy, Row, Deserialize, Default)]
pub struct PlayerTotals {
    pub unique_players: u64,
    pub new_players: u64,
}

#[derive(Debug, Clone, Row, Deserialize)]
pub struct MetricSummary {
    pub name: String,
    pub samples: u64,
    pub last_value: f64,
    pub min_value: f64,
    pub max_value: f64,
    pub avg_value: f64,
    #[serde(with = "clickhouse::serde::chrono::datetime64::millis")]
    pub last_seen: DateTime<Utc>,
}

#[derive(Debug, Clone, Row, Deserialize)]
pub struct MetricPoint {
    #[serde(with = "clickhouse::serde::chrono::datetime64::millis")]
    pub time: DateTime<Utc>,
    pub avg: f64,
    pub max: f64,
    pub min: f64,
    pub count: u64,
}

#[derive(Debug, Clone, Row, Deserialize)]
pub struct LabelBreakdown {
    pub key: String,
    pub value: String,
    pub samples: u64,
    pub total: f64,
}

#[derive(Debug, Clone, Copy, Row, Deserialize, Default)]
pub struct ProjectPeak {
    pub peak_online: u32,
    pub unique_players: u64,
}

impl Analytics {
    /// Total accepted events for a set of projects over the last `hours`.
    pub async fn event_count(&self, project_ids: &[Uuid], hours: u32) -> Result<u64, Error> {
        if project_ids.is_empty() {
            return Ok(0);
        }
        self.client
            .query(
                "SELECT count() FROM events
                  WHERE project_id IN ?
                    AND timestamp >= now() - INTERVAL ? HOUR",
            )
            .bind(project_ids)
            .bind(hours)
            .fetch_one::<u64>()
            .await
    }

    /// Server telemetry, already bucketed and summed across projects by ClickHouse.
    pub async fn server_timeseries(
        &self,
        project_ids: &[Uuid],
        range: Range,
    ) -> Result<Vec<TimePoint>, Error> {
        if project_ids.is_empty() {
            return Ok(Vec::new());
        }
        let sql = format!(
            "SELECT time, sum(project_online) AS online, avg(project_tps) AS tps
               FROM (
                 SELECT toDateTime64({bucket}(timestamp), 3, 'UTC') AS time,
                        project_id,
                        avg(online) AS project_online,
                        avg(tps) AS project_tps
                   FROM server_stats
                  WHERE project_id IN ?
                    AND timestamp >= now() - INTERVAL ? HOUR
                  GROUP BY time, project_id)
              GROUP BY time
              ORDER BY time",
            bucket = range.bucket(),
        );
        self.client
            .query(&sql)
            .bind(project_ids)
            .bind(range.hours())
            .fetch_all()
            .await
    }

    /// One project's telemetry, bucketed. Separate from the overview series because the project
    /// page charts memory and MSPT too.
    pub async fn project_timeseries(
        &self,
        project_id: Uuid,
        range: Range,
    ) -> Result<Vec<ProjectPoint>, Error> {
        let sql = format!(
            "SELECT toDateTime64({bucket}(timestamp), 3, 'UTC') AS time,
                    avg(online) AS online,
                    avg(tps) AS tps,
                    avg(mspt) AS mspt,
                    avg(memory_used_mb) AS memory_used,
                    toFloat64(max(memory_max_mb)) AS memory_max
               FROM server_stats
              WHERE project_id = ? AND timestamp >= now() - INTERVAL ? HOUR
              GROUP BY time
              ORDER BY time",
            bucket = range.bucket(),
        );
        self.client()
            .query(&sql)
            .bind(project_id)
            .bind(range.hours())
            .fetch_all()
            .await
    }

    /// Peak concurrent players and unique players over the window, for server projects.
    pub async fn project_peak(
        &self,
        project_ids: &[Uuid],
        hours: u32,
    ) -> Result<ProjectPeak, Error> {
        if project_ids.is_empty() {
            return Ok(ProjectPeak::default());
        }
        let peak = self
            .client
            .query(
                "SELECT coalesce(max(total), 0) FROM (
                     SELECT toStartOfMinute(timestamp) AS minute, sum(online) AS total
                       FROM server_stats
                      WHERE project_id IN ? AND timestamp >= now() - INTERVAL ? HOUR
                      GROUP BY minute)",
            )
            .bind(project_ids)
            .bind(hours)
            .fetch_one::<u64>()
            .await?;

        let unique = self
            .client
            .query(
                "SELECT countDistinct(player_uuid) FROM sessions
                  WHERE project_id IN ? AND timestamp >= now() - INTERVAL ? HOUR",
            )
            .bind(project_ids)
            .bind(hours)
            .fetch_one::<u64>()
            .await?;

        Ok(ProjectPeak {
            peak_online: u32::try_from(peak).unwrap_or(u32::MAX),
            unique_players: unique,
        })
    }

    /// Distinct fingerprints seen per project — the raw input to the open-error count.
    pub async fn fingerprints_by_project(
        &self,
        project_ids: &[Uuid],
    ) -> Result<Vec<(Uuid, String)>, Error> {
        if project_ids.is_empty() {
            return Ok(Vec::new());
        }
        #[derive(Row, Deserialize)]
        struct Pair {
            #[serde(with = "clickhouse::serde::uuid")]
            project_id: Uuid,
            fingerprint: String,
        }

        let rows: Vec<Pair> = self
            .client
            .query(
                "SELECT project_id, fingerprint FROM errors
                  WHERE project_id IN ?
                  GROUP BY project_id, fingerprint",
            )
            .bind(project_ids)
            .fetch_all()
            .await?;

        Ok(rows
            .into_iter()
            .map(|row| (row.project_id, row.fingerprint))
            .collect())
    }

    /// Error groups for one project, newest attributes winning, capped like the old list.
    pub async fn error_groups(&self, project_id: Uuid) -> Result<Vec<ErrorGroup>, Error> {
        self.client
            .query(
                "SELECT fingerprint,
                        argMax(plugin, timestamp) AS plugin,
                        argMax(level, timestamp) AS level,
                        argMax(message, timestamp) AS message,
                        argMax(server_version, timestamp) AS server_version,
                        argMax(server_software, timestamp) AS server_software,
                        argMax(plugin_version, timestamp) AS plugin_version,
                        count() AS count,
                        min(timestamp) AS first_seen,
                        max(timestamp) AS last_seen
                   FROM errors
                  WHERE project_id = ?
                  GROUP BY fingerprint
                  ORDER BY last_seen DESC
                  LIMIT 200",
            )
            .bind(project_id)
            .fetch_all()
            .await
    }

    /// Plugin-version breakdown of one error group.
    pub async fn error_versions(
        &self,
        project_id: Uuid,
        fingerprint: &str,
    ) -> Result<Vec<LabelledCount>, Error> {
        self.client
            .query(
                "SELECT plugin_version AS label, count() AS count FROM errors
                  WHERE project_id = ? AND fingerprint = ?
                  GROUP BY label
                  ORDER BY count DESC",
            )
            .bind(project_id)
            .bind(fingerprint)
            .fetch_all()
            .await
    }

    /// Errors a plugin caused across every server that shares them with its author.
    pub async fn cross_error_groups(
        &self,
        server_ids: &[Uuid],
        plugin_name: &str,
    ) -> Result<Vec<CrossErrorGroup>, Error> {
        if server_ids.is_empty() {
            return Ok(Vec::new());
        }
        self.client
            .query(
                "SELECT fingerprint,
                        argMax(level, timestamp) AS level,
                        argMax(message, timestamp) AS message,
                        argMax(plugin_version, timestamp) AS plugin_version,
                        count() AS count,
                        countDistinct(project_id) AS servers,
                        min(timestamp) AS first_seen,
                        max(timestamp) AS last_seen
                   FROM errors
                  WHERE project_id IN ? AND plugin = ?
                  GROUP BY fingerprint
                  ORDER BY last_seen DESC
                  LIMIT 100",
            )
            .bind(server_ids)
            .bind(plugin_name)
            .fetch_all()
            .await
    }

    /// Error volume in the trailing window, for spike rule evaluation.
    pub async fn error_count_in_window(
        &self,
        project_id: Uuid,
        window_minutes: i32,
    ) -> Result<u64, Error> {
        self.client
            .query(
                "SELECT count() FROM errors
                  WHERE project_id = ? AND timestamp >= now() - INTERVAL ? MINUTE",
            )
            .bind(project_id)
            .bind(window_minutes)
            .fetch_one()
            .await
    }

    pub async fn recent_sessions(
        &self,
        project_id: Uuid,
        hours: u32,
        limit: u32,
    ) -> Result<Vec<Session>, Error> {
        self.client
            .query(
                "SELECT timestamp, player_uuid, client_version, country_code, duration_seconds
                   FROM sessions
                  WHERE project_id = ? AND timestamp >= now() - INTERVAL ? HOUR
                  ORDER BY timestamp DESC
                  LIMIT ?",
            )
            .bind(project_id)
            .bind(hours)
            .bind(limit)
            .fetch_all()
            .await
    }

    /// Unique and first-ever-seen players in the window, both counted in ClickHouse.
    pub async fn player_totals(&self, project_id: Uuid, hours: u32) -> Result<PlayerTotals, Error> {
        self.client
            .query(
                "SELECT countDistinct(player_uuid) AS unique_players,
                        countDistinctIf(player_uuid, is_new) AS new_players
                   FROM (
                     SELECT player_uuid,
                            min(timestamp) >= now() - INTERVAL ? HOUR AS is_new
                       FROM sessions
                      WHERE project_id = ?
                      GROUP BY player_uuid
                     HAVING max(timestamp) >= now() - INTERVAL ? HOUR)",
            )
            .bind(hours)
            .bind(project_id)
            .bind(hours)
            .fetch_one()
            .await
    }

    pub async fn top_countries(
        &self,
        project_id: Uuid,
        range: Range,
    ) -> Result<Vec<LabelledCount>, Error> {
        self.client
            .query(
                "SELECT country_code AS label, countDistinct(player_uuid) AS count
                   FROM sessions
                  WHERE project_id = ?
                    AND timestamp >= now() - INTERVAL ? HOUR
                    AND country_code != ''
                  GROUP BY label
                  ORDER BY count DESC
                  LIMIT 20",
            )
            .bind(project_id)
            .bind(range.hours())
            .fetch_all()
            .await
    }

    pub async fn top_client_versions(
        &self,
        project_id: Uuid,
        range: Range,
    ) -> Result<Vec<LabelledCount>, Error> {
        self.client
            .query(
                "SELECT client_version AS label, countDistinct(player_uuid) AS count
                   FROM sessions
                  WHERE project_id = ?
                    AND timestamp >= now() - INTERVAL ? HOUR
                    AND client_version != ''
                  GROUP BY label
                  ORDER BY count DESC
                  LIMIT 20",
            )
            .bind(project_id)
            .bind(range.hours())
            .fetch_all()
            .await
    }

    /// Duration statistics over completed sessions only; abandoned ones would skew every bucket.
    pub async fn session_duration(
        &self,
        project_id: Uuid,
        range: Range,
    ) -> Result<SessionDuration, Error> {
        self.client
            .query(
                "SELECT coalesce(avg(duration_seconds), 0) AS average,
                        coalesce(median(duration_seconds), 0) AS median,
                        countIf(duration_seconds < 300) AS under_5m,
                        countIf(duration_seconds >= 300 AND duration_seconds < 900) AS under_15m,
                        countIf(duration_seconds >= 900 AND duration_seconds < 1800) AS under_30m,
                        countIf(duration_seconds >= 1800 AND duration_seconds < 3600) AS under_60m,
                        countIf(duration_seconds >= 3600) AS over_60m
                   FROM sessions
                  WHERE project_id = ?
                    AND timestamp >= now() - INTERVAL ? HOUR
                    AND abandoned = 0
                    AND duration_seconds > 0",
            )
            .bind(project_id)
            .bind(range.hours())
            .fetch_one()
            .await
    }

    /// D1 and D7 cohorts, intersected by ClickHouse rather than pulled into the service.
    ///
    /// Days are UTC on both sides: `today()` would follow the server's timezone while the
    /// timestamps are UTC, silently shifting every cohort by a day near midnight.
    pub async fn retention(&self, project_id: Uuid) -> Result<Retention, Error> {
        self.client
            .query(
                "SELECT
                   countDistinctIf(player_uuid, d = -2) AS day1_cohort,
                   countDistinctIf(player_uuid, d = -2 AND returned_next) AS day1_returned,
                   countDistinctIf(player_uuid, d = -8) AS day7_cohort,
                   countDistinctIf(player_uuid, d = -8 AND returned_next) AS day7_returned
                 FROM (
                   SELECT player_uuid,
                          dateDiff('day', toDate(now(), 'UTC'), toDate(timestamp)) AS d,
                          has(groupArray(dateDiff('day', toDate(now(), 'UTC'), toDate(timestamp)))
                                OVER (PARTITION BY player_uuid), d + 1) AS returned_next
                     FROM sessions
                    WHERE project_id = ?
                      AND timestamp >= now() - INTERVAL 9 DAY)",
            )
            .bind(project_id)
            .fetch_one()
            .await
    }

    pub async fn metric_summaries(
        &self,
        project_id: Uuid,
        range: Range,
    ) -> Result<Vec<MetricSummary>, Error> {
        self.client
            .query(
                "SELECT name,
                        count() AS samples,
                        argMax(value, timestamp) AS last_value,
                        min(value) AS min_value,
                        max(value) AS max_value,
                        avg(value) AS avg_value,
                        max(timestamp) AS last_seen
                   FROM custom_metrics
                  WHERE project_id = ? AND timestamp >= now() - INTERVAL ? HOUR
                  GROUP BY name
                  ORDER BY name",
            )
            .bind(project_id)
            .bind(range.hours())
            .fetch_all()
            .await
    }

    pub async fn metric_series(
        &self,
        project_id: Uuid,
        name: &str,
        range: Range,
    ) -> Result<Vec<MetricPoint>, Error> {
        let sql = format!(
            "SELECT toDateTime64({bucket}(timestamp), 3, 'UTC') AS time,
                    avg(value) AS avg,
                    max(value) AS max,
                    min(value) AS min,
                    count() AS count
               FROM custom_metrics
              WHERE project_id = ? AND name = ? AND timestamp >= now() - INTERVAL ? HOUR
              GROUP BY time
              ORDER BY time",
            bucket = range.metric_bucket(),
        );
        self.client
            .query(&sql)
            .bind(project_id)
            .bind(name)
            .bind(range.hours())
            .fetch_all()
            .await
    }

    /// Breakdown across every label of a metric — a real map, so no key is unreachable.
    pub async fn metric_labels(
        &self,
        project_id: Uuid,
        name: &str,
        range: Range,
    ) -> Result<Vec<LabelBreakdown>, Error> {
        self.client
            .query(
                "SELECT label_key AS key, label_value AS value,
                        count() AS samples, sum(metric_value) AS total
                   FROM (
                     SELECT arrayJoin(labels) AS pair,
                            pair.1 AS label_key,
                            pair.2 AS label_value,
                            value AS metric_value
                       FROM custom_metrics
                      WHERE project_id = ? AND name = ?
                        AND timestamp >= now() - INTERVAL ? HOUR)
                  GROUP BY label_key, label_value
                  ORDER BY label_key, samples DESC",
            )
            .bind(project_id)
            .bind(name)
            .bind(range.hours())
            .fetch_all()
            .await
    }

    /// Distinct fingerprints per project, keyed for the overview error counter.
    pub async fn open_error_counts(
        &self,
        project_ids: &[Uuid],
        suppressed: &[String],
    ) -> Result<BTreeMap<Uuid, u64>, Error> {
        if project_ids.is_empty() {
            return Ok(BTreeMap::new());
        }
        #[derive(Row, Deserialize)]
        struct CountRow {
            #[serde(with = "clickhouse::serde::uuid")]
            project_id: Uuid,
            count: u64,
        }

        let rows: Vec<CountRow> = self
            .client
            .query(
                "SELECT project_id, countDistinct(fingerprint) AS count FROM errors
                  WHERE project_id IN ? AND fingerprint NOT IN ?
                  GROUP BY project_id",
            )
            .bind(project_ids)
            .bind(suppressed)
            .fetch_all()
            .await?;

        Ok(rows
            .into_iter()
            .map(|row| (row.project_id, row.count))
            .collect())
    }
}
