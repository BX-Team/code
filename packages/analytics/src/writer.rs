use std::collections::BTreeMap;

use chrono::{DateTime, Utc};
use clickhouse::{Row, RowOwned, RowWrite};
use serde::Serialize;
use uuid::Uuid;

use crate::{Analytics, Error};

/// Raw mirror of every accepted event; only its volume is read back.
#[derive(Debug, Clone, Row, Serialize)]
pub struct EventPoint {
    #[serde(with = "clickhouse::serde::chrono::datetime64::millis")]
    pub timestamp: DateTime<Utc>,
    #[serde(with = "clickhouse::serde::uuid")]
    pub project_id: Uuid,
    pub kind: String,
    pub payload: String,
}

#[derive(Debug, Clone, Row, Serialize)]
pub struct ServerStatsPoint {
    #[serde(with = "clickhouse::serde::chrono::datetime64::millis")]
    pub timestamp: DateTime<Utc>,
    #[serde(with = "clickhouse::serde::uuid")]
    pub project_id: Uuid,
    pub online: u32,
    pub tps: f64,
    pub mspt: f64,
    pub memory_used_mb: u64,
    pub memory_max_mb: u64,
}

/// One completed session. `timestamp` is the moment the player left, not joined.
#[derive(Debug, Clone, Row, Serialize)]
pub struct SessionPoint {
    #[serde(with = "clickhouse::serde::chrono::datetime64::millis")]
    pub timestamp: DateTime<Utc>,
    #[serde(with = "clickhouse::serde::uuid")]
    pub project_id: Uuid,
    #[serde(with = "clickhouse::serde::uuid")]
    pub player_uuid: Uuid,
    pub client_version: String,
    pub country_code: String,
    pub abandoned: u8,
    pub duration_seconds: u32,
}

#[derive(Debug, Clone, Row, Serialize)]
pub struct ErrorPoint {
    #[serde(with = "clickhouse::serde::chrono::datetime64::millis")]
    pub timestamp: DateTime<Utc>,
    #[serde(with = "clickhouse::serde::uuid")]
    pub project_id: Uuid,
    pub fingerprint: String,
    pub plugin: String,
    pub level: String,
    pub server_version: String,
    pub server_software: String,
    pub plugin_version: String,
    pub message: String,
}

#[derive(Debug, Clone, Row, Serialize)]
pub struct MetricPoint {
    #[serde(with = "clickhouse::serde::chrono::datetime64::millis")]
    pub timestamp: DateTime<Utc>,
    #[serde(with = "clickhouse::serde::uuid")]
    pub project_id: Uuid,
    pub name: String,
    pub labels: BTreeMap<String, String>,
    pub value: f64,
}

/// Rows produced while handling one queue batch, written in one round trip per table.
#[derive(Debug, Default)]
pub struct Batch {
    pub events: Vec<EventPoint>,
    pub server_stats: Vec<ServerStatsPoint>,
    pub sessions: Vec<SessionPoint>,
    pub errors: Vec<ErrorPoint>,
    pub metrics: Vec<MetricPoint>,
}

impl Batch {
    pub fn is_empty(&self) -> bool {
        self.events.is_empty()
            && self.server_stats.is_empty()
            && self.sessions.is_empty()
            && self.errors.is_empty()
            && self.metrics.is_empty()
    }
}

impl Analytics {
    pub async fn write(&self, batch: &Batch) -> Result<(), Error> {
        self.insert_all("events", &batch.events).await?;
        self.insert_all("server_stats", &batch.server_stats).await?;
        self.insert_all("sessions", &batch.sessions).await?;
        self.insert_all("errors", &batch.errors).await?;
        self.insert_all("custom_metrics", &batch.metrics).await
    }

    async fn insert_all<T>(&self, table: &str, rows: &[T]) -> Result<(), Error>
    where
        T: RowOwned + RowWrite,
    {
        if rows.is_empty() {
            return Ok(());
        }
        let mut insert = self.client.insert::<T>(table).await?;
        for row in rows {
            insert.write(row).await?;
        }
        insert.end().await
    }
}
