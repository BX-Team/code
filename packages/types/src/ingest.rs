use std::collections::BTreeMap;

use serde::{Deserialize, Deserializer, Serialize};
use serde_json::Value;
use uuid::Uuid;

/// One event as produced by the Pulsify SDK. `type` is the discriminator.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum IngestEvent {
    Heartbeat(Heartbeat),
    Event(PlayerEvent),
    Error(ErrorEvent),
    Metric(MetricEvent),
}

impl IngestEvent {
    /// Discriminator as written to the raw event mirror.
    pub fn kind(&self) -> &'static str {
        match self {
            Self::Heartbeat(_) => "heartbeat",
            Self::Event(_) => "event",
            Self::Error(_) => "error",
            Self::Metric(_) => "metric",
        }
    }

    /// Client-supplied capture time, epoch milliseconds.
    pub fn timestamp(&self) -> i64 {
        match self {
            Self::Heartbeat(e) => e.timestamp,
            Self::Event(e) => e.timestamp,
            Self::Error(e) => e.timestamp,
            Self::Metric(e) => e.timestamp,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Heartbeat {
    pub timestamp: i64,
    pub server: ServerInfo,
    #[serde(default, deserialize_with = "null_to_default")]
    pub plugins: Vec<PluginInfo>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ServerInfo {
    pub online: i64,
    pub max: i64,
    pub tps: f64,
    pub mspt: f64,
    pub memory_used_mb: i64,
    pub memory_max_mb: i64,
    pub version: String,
    pub software: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct PluginInfo {
    pub name: String,
    pub version: String,
    pub enabled: bool,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PlayerEvent {
    pub timestamp: i64,
    pub event: PlayerAction,
    pub payload: PlayerPayload,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PlayerAction {
    PlayerJoin,
    PlayerQuit,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct PlayerPayload {
    pub player_uuid: Uuid,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub client_version: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub player_ip: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ErrorEvent {
    pub timestamp: i64,
    pub plugin: String,
    pub error: ErrorDetail,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ErrorDetail {
    pub message: String,
    #[serde(default, deserialize_with = "null_to_default")]
    pub stacktrace: String,
    #[serde(default, deserialize_with = "null_to_default")]
    pub level: ErrorLevel,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub server_version: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub server_software: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub plugin_version: Option<String>,
}

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ErrorLevel {
    Warning,
    #[default]
    Error,
    Fatal,
}

impl ErrorLevel {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Warning => "warning",
            Self::Error => "error",
            Self::Fatal => "fatal",
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct MetricEvent {
    pub timestamp: i64,
    pub name: String,
    pub value: f64,
    #[serde(default, deserialize_with = "null_to_default")]
    pub labels: BTreeMap<String, String>,
}

/// Request body of `POST /api/v1/e/{projectId}`: a batch, or a bare event from older SDKs.
#[derive(Debug, Clone, Deserialize)]
#[serde(untagged)]
pub enum RawBatch {
    Many(Vec<Value>),
    One(Value),
}

impl RawBatch {
    pub fn into_vec(self) -> Vec<Value> {
        match self {
            Self::Many(events) => events,
            Self::One(event) => vec![event],
        }
    }
}

fn null_to_default<'de, D, T>(deserializer: D) -> Result<T, D::Error>
where
    D: Deserializer<'de>,
    T: Default + Deserialize<'de>,
{
    Ok(Option::deserialize(deserializer)?.unwrap_or_default())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn omitted_optionals_match_json_include_non_null() {
        let event: IngestEvent = serde_json::from_str(
            r#"{"type":"error","timestamp":1,"plugin":"Quark","error":{"message":"x"}}"#,
        )
        .unwrap();

        let IngestEvent::Error(error) = event else {
            panic!("expected error event");
        };
        assert_eq!(error.error.stacktrace, "");
        assert_eq!(error.error.level, ErrorLevel::Error);
        assert_eq!(error.error.server_version, None);
    }

    #[test]
    fn explicit_nulls_are_accepted_too() {
        let event: IngestEvent = serde_json::from_str(
            r#"{"type":"metric","timestamp":1,"name":"m","value":0.5,"labels":null}"#,
        )
        .unwrap();

        let IngestEvent::Metric(metric) = event else {
            panic!("expected metric event");
        };
        assert!(metric.labels.is_empty());
    }

    #[test]
    fn unknown_fields_do_not_break_deserialization() {
        let event: IngestEvent = serde_json::from_str(
            r#"{"type":"metric","timestamp":1,"name":"m","value":1,"sample_rate":0.5}"#,
        )
        .unwrap();
        assert_eq!(event.kind(), "metric");
    }

    #[test]
    fn a_bare_event_is_a_batch_of_one() {
        let raw: RawBatch = serde_json::from_str(r#"{"type":"metric"}"#).unwrap();
        assert_eq!(raw.into_vec().len(), 1);

        let raw: RawBatch =
            serde_json::from_str(r#"[{"type":"metric"},{"type":"error"}]"#).unwrap();
        assert_eq!(raw.into_vec().len(), 2);
    }

    #[test]
    fn a_non_uuid_player_is_rejected() {
        let result = serde_json::from_str::<IngestEvent>(
            r#"{"type":"event","timestamp":1,"event":"player_join","payload":{"player_uuid":"nope"}}"#,
        );
        assert!(result.is_err());
    }
}
