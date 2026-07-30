use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

/// Every timestamp the dashboard reads is an ISO string with milliseconds, as `Date` produces.
pub fn iso(value: DateTime<Utc>) -> String {
    value.to_rfc3339_opts(chrono::SecondsFormat::Millis, true)
}

pub fn percent(part: u64, total: u64) -> f64 {
    if total == 0 {
        return 0.0;
    }
    ((part as f64 / total as f64) * 1000.0).round() / 10.0
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct Project {
    pub id: Uuid,
    pub name: String,
    pub slug: String,
    #[serde(rename = "type")]
    pub kind: String,
    pub description: Option<String>,
    pub verified: bool,
    pub created_at: String,
    pub last_seen_at: Option<String>,
    pub errors: u64,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct OverviewProject {
    pub id: Uuid,
    pub name: String,
    pub slug: String,
    #[serde(rename = "type")]
    pub kind: String,
    pub last_seen_at: Option<String>,
    pub software: Option<String>,
    pub mc_version: Option<String>,
    pub errors: u64,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct OverviewSummary {
    pub projects: usize,
    pub servers: usize,
    pub plugins: usize,
    pub mods: usize,
    pub total_errors: u64,
    pub total_events24h: u64,
    pub peak_online24h: u32,
    pub unique_players24h: u64,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct OverviewPoint {
    pub time: String,
    pub online: f64,
    pub tps: f64,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct Overview {
    pub summary: OverviewSummary,
    pub timeseries: Vec<OverviewPoint>,
    pub projects: Vec<OverviewProject>,
    pub range: &'static str,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct Limits {
    pub max_projects: i32,
    pub max_events_per_day: i64,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct Usage {
    pub projects: i64,
    pub events_today: u64,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct Billing {
    pub plan: &'static str,
    pub limits: Limits,
    pub usage: Usage,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateProject {
    pub name: String,
    pub slug: String,
    #[serde(rename = "type")]
    pub kind: String,
    pub description: Option<String>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct SetVerified {
    pub verified: bool,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct StatsProject {
    pub id: Uuid,
    pub name: String,
    pub slug: String,
    #[serde(rename = "type")]
    pub kind: String,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct Metadata {
    pub last_seen_at: String,
    pub software: Option<String>,
    pub mc_version: Option<String>,
    pub country_code: Option<String>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct StatsPoint {
    pub time: String,
    pub online: f64,
    pub tps: f64,
    pub mspt: f64,
    pub memory_used: f64,
    pub memory_max: f64,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct StatsSummary {
    pub total_errors: u64,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct Stats {
    pub project: StatsProject,
    pub metadata: Option<Metadata>,
    pub timeseries: Vec<StatsPoint>,
    pub summary: StatsSummary,
    pub range: &'static str,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct PlayerSession {
    pub player_uuid: Uuid,
    pub joined_at: String,
    pub client_version: String,
    pub country_code: String,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct PlayersSummary {
    pub unique_players: u64,
    pub new_players: u64,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct Players {
    pub sessions: Vec<PlayerSession>,
    pub summary: PlayersSummary,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct Country {
    pub code: String,
    pub count: u64,
    pub pct: f64,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct Geography {
    pub countries: Vec<Country>,
    pub total: u64,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct ClientVersion {
    pub version: String,
    pub count: u64,
    pub pct: f64,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct ClientVersions {
    pub versions: Vec<ClientVersion>,
    pub total: u64,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct Bucket {
    pub label: &'static str,
    pub count: u64,
    pub pct: f64,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct SessionDuration {
    pub avg_seconds: f64,
    pub median_seconds: f64,
    pub total_sessions: u64,
    pub distribution: Vec<Bucket>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct Cohort {
    pub cohort: u64,
    pub retained: u64,
    pub pct: f64,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct Retention {
    pub d1: Cohort,
    pub d7: Cohort,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct VersionShare {
    pub version: String,
    pub count: u64,
    pub pct: f64,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct PluginInsights {
    pub total_installs: u64,
    pub enabled_installs: u64,
    pub latest_version: Option<String>,
    pub latest_version_adoption: f64,
    pub versions: Vec<VersionShare>,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ErrorRow {
    pub id: String,
    pub plugin: String,
    pub message: String,
    pub stacktrace: String,
    pub level: String,
    pub count: u64,
    pub first_seen_at: String,
    pub last_seen_at: String,
    pub status: String,
    pub muted_until: Option<String>,
    pub resolved_at: Option<String>,
    pub first_version: Option<String>,
    pub last_version: Option<String>,
    pub server_version: Option<String>,
    pub server_software: Option<String>,
    pub plugin_version: Option<String>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct StatusCounts {
    pub unresolved: usize,
    pub resolved: usize,
    pub ignored: usize,
    pub all: usize,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct Errors {
    pub errors: Vec<ErrorRow>,
    pub total: usize,
    pub counts: StatusCounts,
    pub sort: String,
    pub status: String,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct CrossError {
    pub id: String,
    pub message: String,
    pub stacktrace: String,
    pub level: String,
    pub count: u64,
    pub server_count: u64,
    pub first_seen_at: String,
    pub last_seen_at: String,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct CrossErrors {
    pub errors: Vec<CrossError>,
    pub total: usize,
    pub total_servers: usize,
    pub sharing_servers: usize,
    pub verified: bool,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct VersionStat {
    pub version: Option<String>,
    pub count: u64,
    pub first_seen: String,
    pub last_seen: String,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct VersionStats {
    pub versions: Vec<VersionStat>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct Payload {
    pub plugin: String,
    pub message: String,
    pub stacktrace: String,
    pub level: String,
    pub timestamp: i64,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct IssueAction {
    pub fingerprint: String,
    pub action: String,
    pub hours: Option<i64>,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct MetricSummary {
    pub name: String,
    pub total_points: u64,
    pub max_value: f64,
    pub min_value: f64,
    pub avg_value: f64,
    pub last_seen_at: String,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct MetricsList {
    pub metrics: Vec<MetricSummary>,
    pub range: &'static str,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct SeriesPoint {
    pub time: String,
    pub avg: f64,
    pub max: f64,
    pub min: f64,
    pub count: u64,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct LabelValue {
    pub value: String,
    pub total: f64,
    pub count: u64,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct LabelBreakdown {
    pub key: String,
    pub values: Vec<LabelValue>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct MetricSeries {
    pub name: String,
    pub range: &'static str,
    pub series: Vec<SeriesPoint>,
    pub labels: Vec<LabelBreakdown>,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct Token {
    pub id: Uuid,
    pub label: Option<String>,
    pub revoked: bool,
    pub last_used_at: Option<String>,
    pub created_at: String,
}

/// The only response that ever carries the key itself.
#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct CreatedToken {
    pub id: Uuid,
    pub key: String,
    pub label: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateToken {
    pub label: Option<String>,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct AlertRule {
    pub id: Uuid,
    #[serde(rename = "type")]
    pub kind: String,
    pub enabled: bool,
    pub threshold: i32,
    pub window_minutes: i32,
    pub webhook_url: String,
    pub last_fired_at: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct AlertRules {
    pub rules: Vec<AlertRule>,
}

#[derive(Debug, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct CreateAlertRule {
    #[serde(rename = "type")]
    pub kind: String,
    pub webhook_url: String,
    pub threshold: Option<i32>,
    pub window_minutes: Option<i32>,
}

#[derive(Debug, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct UpdateAlertRule {
    pub enabled: Option<bool>,
    pub threshold: Option<i32>,
    pub window_minutes: Option<i32>,
    pub webhook_url: Option<String>,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct Installation {
    pub plugin_id: Uuid,
    pub name: String,
    pub slug: String,
    pub version: String,
    pub enabled: bool,
    pub share_errors: bool,
    pub last_seen_at: String,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct Installations {
    pub installations: Vec<Installation>,
}

#[derive(Debug, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct SetShareErrors {
    pub share_errors: bool,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn percentages_are_rounded_to_one_decimal() {
        assert_eq!(percent(1, 3), 33.3);
        assert_eq!(percent(2, 3), 66.7);
        assert_eq!(percent(1, 1), 100.0);
        assert_eq!(percent(0, 0), 0.0);
        assert_eq!(percent(5, 0), 0.0);
    }

    #[test]
    fn timestamps_carry_milliseconds() {
        let value = DateTime::from_timestamp(1_767_225_600, 0).unwrap();
        assert_eq!(iso(value), "2026-01-01T00:00:00.000Z");
    }
}
