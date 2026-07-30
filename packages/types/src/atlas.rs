use chrono::{DateTime, SecondsFormat, Utc};
use indexmap::IndexMap;
use serde::{Deserialize, Serialize, Serializer};
use utoipa::ToSchema;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "UPPERCASE")]
pub enum Channel {
    Alpha,
    Beta,
    Stable,
}

impl Channel {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Alpha => "ALPHA",
            Self::Beta => "BETA",
            Self::Stable => "STABLE",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "UPPERCASE")]
pub enum SupportStatus {
    Supported,
    Deprecated,
    Unsupported,
}

impl SupportStatus {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Supported => "SUPPORTED",
            Self::Deprecated => "DEPRECATED",
            Self::Unsupported => "UNSUPPORTED",
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, ToSchema)]
pub struct Project {
    pub id: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(rename = "latestVersion", skip_serializing_if = "Option::is_none")]
    pub latest_version: Option<String>,
    #[serde(
        rename = "experimentalVersion",
        skip_serializing_if = "Option::is_none"
    )]
    pub experimental_version: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, ToSchema)]
pub struct ProjectResponse {
    pub project: Project,
    #[schema(value_type = std::collections::BTreeMap<String, Vec<String>>)]
    pub version_groups: IndexMap<String, Vec<String>>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, ToSchema)]
pub struct ProjectsResponse {
    pub projects: Vec<ProjectResponse>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, ToSchema)]
pub struct JavaVersion {
    pub minimum: i32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, ToSchema)]
pub struct JavaRequirement {
    pub version: JavaVersion,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, ToSchema)]
pub struct Support {
    pub status: SupportStatus,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, ToSchema)]
pub struct Version {
    pub id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub java: Option<JavaRequirement>,
    pub support: Support,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, ToSchema)]
pub struct VersionResponse {
    pub version: Version,
    pub builds: Vec<i64>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, ToSchema)]
pub struct Commit {
    pub sha: String,
    pub message: String,
    #[serde(serialize_with = "iso_millis")]
    #[schema(value_type = String)]
    pub time: DateTime<Utc>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, ToSchema)]
pub struct Checksums {
    pub sha256: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, ToSchema)]
pub struct Download {
    pub name: String,
    pub checksums: Checksums,
    pub size: i64,
    pub url: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, ToSchema)]
pub struct Build {
    pub id: i64,
    #[serde(serialize_with = "iso_millis")]
    #[schema(value_type = String)]
    pub time: DateTime<Utc>,
    pub channel: Channel,
    pub commits: Vec<Commit>,
    #[schema(value_type = std::collections::BTreeMap<String, Download>)]
    pub downloads: IndexMap<String, Download>,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct CreateVersionBody {
    pub key: String,
    pub support_status: Option<SupportStatus>,
    pub java_min_version: Option<i32>,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, ToSchema)]
pub struct CommitInput {
    pub sha: String,
    pub message: String,
    pub time: DateTime<Utc>,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct UploadMetadata {
    pub build_number: Option<i64>,
    pub channel: Option<Channel>,
    pub commits: Option<Vec<CommitInput>>,
}

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Deserialize, ToSchema)]
pub struct BuildsQuery {
    pub channel: Option<Channel>,
}

/// Treats an empty string as absent, so the response omits the field instead of sending `""`.
pub fn non_empty(value: Option<String>) -> Option<String> {
    value.filter(|s| !s.is_empty())
}

fn iso_millis<S: Serializer>(value: &DateTime<Utc>, serializer: S) -> Result<S::Ok, S::Error> {
    // `Date#toISOString` always renders milliseconds; the old responses are cached and compared.
    serializer.serialize_str(&value.to_rfc3339_opts(SecondsFormat::Millis, true))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn project() -> Project {
        Project {
            id: "divinemc".into(),
            name: "DivineMC".into(),
            description: None,
            latest_version: Some("1.21.4".into()),
            experimental_version: None,
        }
    }

    #[test]
    fn absent_optionals_are_omitted_not_nulled() {
        let json = serde_json::to_string(&project()).unwrap();
        assert_eq!(
            json,
            r#"{"id":"divinemc","name":"DivineMC","latestVersion":"1.21.4"}"#
        );
    }

    #[test]
    fn version_group_order_survives_serialization() {
        let response = ProjectResponse {
            project: project(),
            version_groups: crate::version::group_versions(["1.21.4", "26.1.2", "26.1"]),
        };
        let json = serde_json::to_string(&response).unwrap();
        assert!(
            json.ends_with(r#""version_groups":{"26.1":["26.1.2","26.1"],"1.21":["1.21.4"]}}"#),
            "{json}"
        );
    }

    #[test]
    fn build_time_renders_with_milliseconds() {
        let build = Build {
            id: 142,
            time: DateTime::from_timestamp(1_767_225_600, 0).unwrap(),
            channel: Channel::Stable,
            commits: Vec::new(),
            downloads: IndexMap::new(),
        };
        let json = serde_json::to_string(&build).unwrap();
        assert!(
            json.contains(r#""time":"2026-01-01T00:00:00.000Z""#),
            "{json}"
        );
        assert!(json.contains(r#""channel":"STABLE""#), "{json}");
    }
}
