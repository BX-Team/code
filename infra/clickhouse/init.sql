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
    country_code    String
)
ENGINE = MergeTree()
ORDER BY (project_id, joined_at);

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
