CREATE TABLE IF NOT EXISTS events
(
    project_id  String,
    event_type  String,
    timestamp   DateTime,
    properties  String
)
ENGINE = MergeTree()
ORDER BY (project_id, timestamp);

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
ORDER BY (project_id, player_uuid, joined_at);

CREATE TABLE IF NOT EXISTS server_stats
(
    project_id   String,
    timestamp    DateTime,
    online       UInt32,
    tps          Float32,
    mspt         Float32,
    memory_used  UInt32
)
ENGINE = MergeTree()
ORDER BY (project_id, timestamp);

CREATE TABLE IF NOT EXISTS error_events
(
    project_id  String,
    plugin      String,
    message     String,
    stacktrace  String,
    level       String,
    timestamp   DateTime
)
ENGINE = MergeTree()
ORDER BY (project_id, timestamp);
