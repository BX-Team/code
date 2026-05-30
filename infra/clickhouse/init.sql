CREATE TABLE IF NOT EXISTS events
(
    project_id  String,
    event_type  String,
    timestamp   DateTime,
    properties  String
)
ENGINE = MergeTree()
ORDER BY (project_id, timestamp)
TTL timestamp + INTERVAL 90 DAY;

CREATE TABLE IF NOT EXISTS player_sessions
(
    project_id      String,
    player_uuid     String,
    joined_at       DateTime,
    left_at         Nullable(DateTime),
    client_version  String,
    country_code    String,
    ver             UInt8
)
ENGINE = ReplacingMergeTree(ver)
ORDER BY (project_id, player_uuid, joined_at)
TTL joined_at + INTERVAL 90 DAY;

CREATE TABLE IF NOT EXISTS server_stats
(
    project_id   String,
    timestamp    DateTime,
    online       UInt32,
    tps          Float32,
    mspt         Float32,
    memory_used  UInt32,
    memory_max   UInt32 DEFAULT 0
)
ENGINE = MergeTree()
ORDER BY (project_id, timestamp)
TTL timestamp + INTERVAL 90 DAY;
-- existing deployments: ALTER TABLE server_stats ADD COLUMN IF NOT EXISTS memory_max UInt32 DEFAULT 0;

CREATE TABLE IF NOT EXISTS error_events
(
    project_id       String,
    plugin           String,
    message          String,
    stacktrace       String,
    level            String,
    server_version   String DEFAULT '',
    server_software  String DEFAULT '',
    plugin_version   String DEFAULT '',
    fingerprint      String DEFAULT '',
    timestamp        DateTime
)
ENGINE = MergeTree()
ORDER BY (project_id, timestamp)
TTL timestamp + INTERVAL 180 DAY;
-- existing deployments:
--   ALTER TABLE error_events ADD COLUMN IF NOT EXISTS server_version String DEFAULT '';
--   ALTER TABLE error_events ADD COLUMN IF NOT EXISTS server_software String DEFAULT '';
--   ALTER TABLE error_events ADD COLUMN IF NOT EXISTS plugin_version String DEFAULT '';
--   ALTER TABLE error_events ADD COLUMN IF NOT EXISTS fingerprint String DEFAULT '';

CREATE TABLE IF NOT EXISTS custom_metrics
(
    project_id  String,
    name        LowCardinality(String),
    value       Float64,
    labels      Map(String, String),
    timestamp   DateTime
)
ENGINE = MergeTree()
ORDER BY (project_id, name, timestamp)
TTL timestamp + INTERVAL 90 DAY;
