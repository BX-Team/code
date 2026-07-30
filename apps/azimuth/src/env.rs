use std::net::SocketAddr;

/// Configuration is read once at startup: a service missing a variable must fail immediately.
#[derive(Debug, Clone)]
pub struct Config {
    pub bind: SocketAddr,
    pub database_url: String,
    pub clickhouse_url: String,
    pub clickhouse_database: String,
    pub clickhouse_user: String,
    pub clickhouse_password: String,
    pub app_url: String,
    pub api_public_url: String,
    pub trusted_origins: Vec<String>,
    pub api_secret_key: String,
    pub cookie_domain: String,
    pub smtp_url: String,
    pub email_from: String,
    pub github_client_id: String,
    pub github_client_secret: String,
    pub discord_client_id: String,
    pub discord_client_secret: String,
    pub storage: storage::Config,
    pub max_upload_bytes: usize,
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
            bind: parse("AZIMUTH_BIND", "127.0.0.1:8080", "socket address")?,
            database_url: required("DATABASE_URL")?,
            clickhouse_url: optional("CLICKHOUSE_URL", "http://127.0.0.1:8123"),
            clickhouse_database: optional("CLICKHOUSE_DATABASE", "bx_team"),
            clickhouse_user: optional("CLICKHOUSE_USER", "default"),
            clickhouse_password: optional("CLICKHOUSE_PASSWORD", ""),
            app_url: optional("APP_URL", "https://bxteam.org"),
            api_public_url: optional("API_PUBLIC_URL", "https://api.bxteam.org"),
            trusted_origins: optional("TRUSTED_ORIGINS", "https://bxteam.org")
                .split(',')
                .map(str::trim)
                .filter(|origin| !origin.is_empty())
                .map(ToOwned::to_owned)
                .collect(),
            api_secret_key: required("API_SECRET_KEY")?,
            cookie_domain: optional("COOKIE_DOMAIN", ".bxteam.org"),
            smtp_url: optional("SMTP_URL", "smtp://127.0.0.1:25"),
            email_from: optional("EMAIL_FROM", "BX Team <no-reply@bxteam.org>"),
            github_client_id: optional("GITHUB_CLIENT_ID", ""),
            github_client_secret: optional("GITHUB_CLIENT_SECRET", ""),
            discord_client_id: optional("DISCORD_CLIENT_ID", ""),
            discord_client_secret: optional("DISCORD_CLIENT_SECRET", ""),
            storage: storage::Config {
                endpoint: required("R2_ENDPOINT")?,
                access_key_id: required("R2_ACCESS_KEY_ID")?,
                secret_access_key: required("R2_SECRET_ACCESS_KEY")?,
                builds_bucket: optional("R2_BUILDS_BUCKET", "builds"),
                error_payloads_bucket: optional("R2_ERROR_PAYLOADS_BUCKET", "error-payloads"),
                public_url: optional("R2_PUBLIC_URL", "https://files.bxteam.org"),
            },
            max_upload_bytes: parse("AZIMUTH_MAX_UPLOAD_BYTES", "1073741824", "number")?,
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
