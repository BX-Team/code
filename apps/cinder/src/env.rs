use std::path::PathBuf;

/// Configuration is read once at startup: a service missing a variable must fail immediately.
#[derive(Debug, Clone)]
pub struct Config {
    pub database_url: String,
    pub clickhouse_url: String,
    pub clickhouse_database: String,
    pub clickhouse_user: String,
    pub clickhouse_password: String,
    pub app_url: String,
    pub ipinfo_mmdb_path: Option<PathBuf>,
    pub storage: storage::Config,
    pub batch_size: i64,
    pub idle_sleep_ms: u64,
    pub usage_retention_days: i32,
}

#[derive(Debug, thiserror::Error)]
pub enum ConfigError {
    #[error("{0} is not set")]
    Missing(&'static str),

    #[error("{name} is not a valid {expected}: {value}")]
    Invalid {
        name: &'static str,
        expected: &'static str,
        value: String,
    },
}

impl Config {
    pub fn from_env() -> Result<Self, ConfigError> {
        Ok(Self {
            database_url: required("DATABASE_URL")?,
            clickhouse_url: optional("CLICKHOUSE_URL", "http://127.0.0.1:8123"),
            clickhouse_database: optional("CLICKHOUSE_DATABASE", "bx_team"),
            clickhouse_user: optional("CLICKHOUSE_USER", "default"),
            clickhouse_password: optional("CLICKHOUSE_PASSWORD", ""),
            app_url: optional("APP_URL", "https://bxteam.org"),
            ipinfo_mmdb_path: std::env::var("IPINFO_MMDB_PATH")
                .ok()
                .filter(|value| !value.is_empty())
                .map(PathBuf::from),
            storage: storage::Config {
                endpoint: required("R2_ENDPOINT")?,
                access_key_id: required("R2_ACCESS_KEY_ID")?,
                secret_access_key: required("R2_SECRET_ACCESS_KEY")?,
                builds_bucket: optional("R2_BUILDS_BUCKET", "builds"),
                error_payloads_bucket: optional("R2_ERROR_PAYLOADS_BUCKET", "error-payloads"),
                public_url: optional("R2_PUBLIC_URL", "https://files.bxteam.org"),
            },
            batch_size: parse("CINDER_BATCH_SIZE", "100", "number")?,
            idle_sleep_ms: parse("CINDER_IDLE_SLEEP_MS", "500", "number")?,
            usage_retention_days: parse("CINDER_USAGE_RETENTION_DAYS", "90", "number")?,
        })
    }
}

fn required(name: &'static str) -> Result<String, ConfigError> {
    std::env::var(name)
        .ok()
        .filter(|value| !value.is_empty())
        .ok_or(ConfigError::Missing(name))
}

fn optional(name: &str, default: &str) -> String {
    std::env::var(name)
        .ok()
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| default.to_owned())
}

fn parse<T: std::str::FromStr>(
    name: &'static str,
    default: &str,
    expected: &'static str,
) -> Result<T, ConfigError> {
    let value = optional(name, default);
    value.parse().map_err(|_| ConfigError::Invalid {
        name,
        expected,
        value,
    })
}
