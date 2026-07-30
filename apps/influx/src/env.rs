use std::net::SocketAddr;

/// Configuration is read once at startup: a service missing a variable must fail immediately.
#[derive(Debug, Clone)]
pub struct Config {
    pub bind: SocketAddr,
    pub database_url: String,
    pub requests_per_minute: u32,
    pub max_body_bytes: usize,
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
            bind: parse("INFLUX_BIND", "127.0.0.1:8081", "socket address")?,
            database_url: required("DATABASE_URL")?,
            requests_per_minute: parse("INFLUX_RATE_LIMIT", "100", "number")?,
            max_body_bytes: parse("INFLUX_MAX_BODY_BYTES", "4194304", "number")?,
        })
    }
}

fn required(name: &'static str) -> Result<String, ConfigError> {
    std::env::var(name)
        .ok()
        .filter(|value| !value.is_empty())
        .ok_or(ConfigError::Missing(name))
}

fn parse<T: std::str::FromStr>(
    name: &'static str,
    default: &str,
    expected: &'static str,
) -> Result<T, ConfigError> {
    let value = std::env::var(name)
        .ok()
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| default.to_owned());

    value.parse().map_err(|_| ConfigError::Invalid {
        name,
        expected,
        value,
    })
}
