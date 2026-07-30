use crate::{Analytics, Error};

const DDL: &[&str] = &[
    r"CREATE TABLE IF NOT EXISTS events (
        timestamp  DateTime64(3, 'UTC'),
        project_id UUID,
        kind       LowCardinality(String),
        payload    String
    ) ENGINE = MergeTree
      PARTITION BY toYYYYMM(timestamp)
      ORDER BY (project_id, timestamp)
      TTL toDateTime(timestamp) + INTERVAL 90 DAY",
    r"CREATE TABLE IF NOT EXISTS server_stats (
        timestamp      DateTime64(3, 'UTC'),
        project_id     UUID,
        online         UInt32,
        tps            Float64,
        mspt           Float64,
        memory_used_mb UInt64,
        memory_max_mb  UInt64
    ) ENGINE = MergeTree
      PARTITION BY toYYYYMM(timestamp)
      ORDER BY (project_id, timestamp)
      TTL toDateTime(timestamp) + INTERVAL 400 DAY",
    r"CREATE TABLE IF NOT EXISTS sessions (
        timestamp        DateTime64(3, 'UTC'),
        project_id       UUID,
        player_uuid      UUID,
        client_version   LowCardinality(String),
        country_code     LowCardinality(String),
        abandoned        UInt8,
        duration_seconds UInt32
    ) ENGINE = MergeTree
      PARTITION BY toYYYYMM(timestamp)
      ORDER BY (project_id, timestamp)
      TTL toDateTime(timestamp) + INTERVAL 400 DAY",
    r"CREATE TABLE IF NOT EXISTS errors (
        timestamp       DateTime64(3, 'UTC'),
        project_id      UUID,
        fingerprint     String,
        plugin          LowCardinality(String),
        level           LowCardinality(String),
        server_version  LowCardinality(String),
        server_software LowCardinality(String),
        plugin_version  LowCardinality(String),
        message         String
    ) ENGINE = MergeTree
      PARTITION BY toYYYYMM(timestamp)
      ORDER BY (project_id, fingerprint, timestamp)
      TTL toDateTime(timestamp) + INTERVAL 180 DAY",
    r"CREATE TABLE IF NOT EXISTS custom_metrics (
        timestamp  DateTime64(3, 'UTC'),
        project_id UUID,
        name       LowCardinality(String),
        labels     Map(String, String),
        value      Float64
    ) ENGINE = MergeTree
      PARTITION BY toYYYYMM(timestamp)
      ORDER BY (project_id, name, timestamp)
      TTL toDateTime(timestamp) + INTERVAL 180 DAY",
];

impl Analytics {
    /// Creates the database and its five tables; safe to run on every start.
    pub async fn migrate(&self) -> Result<(), Error> {
        let create_database = format!("CREATE DATABASE IF NOT EXISTS {}", self.database);
        // Issued against `default`: the target database is what this statement is creating.
        self.client
            .clone()
            .with_database("default")
            .query(&create_database)
            .with_setting("wait_end_of_query", "1")
            .execute()
            .await?;

        for statement in DDL {
            self.client.query(statement).execute().await?;
        }
        Ok(())
    }
}
