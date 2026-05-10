CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT,
  type TEXT NOT NULL CHECK(type IN ('http', 'push')),
  method TEXT NOT NULL DEFAULT 'GET',
  expected_status INTEGER NOT NULL DEFAULT 200,
  timeout_ms INTEGER NOT NULL DEFAULT 10000,
  push_interval_ms INTEGER NOT NULL DEFAULT 60000,
  fail_threshold INTEGER NOT NULL DEFAULT 2,
  group_name TEXT NOT NULL DEFAULT 'Services',
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS service_status (
  service_id TEXT PRIMARY KEY,
  is_up INTEGER NOT NULL DEFAULT 1,
  last_check_at INTEGER,
  last_response_ms INTEGER,
  last_heartbeat_at INTEGER,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS incidents (
  id TEXT PRIMARY KEY,
  service_id TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  resolved_at INTEGER,
  down_message_id INTEGER,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bot_state (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS uptime_daily (
  service_id TEXT NOT NULL,
  date TEXT NOT NULL,
  checks_total INTEGER NOT NULL DEFAULT 0,
  checks_ok INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (service_id, date),
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_incidents_service ON incidents(service_id);
CREATE INDEX IF NOT EXISTS idx_incidents_unresolved ON incidents(resolved_at) WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_uptime_daily_service ON uptime_daily(service_id, date);
