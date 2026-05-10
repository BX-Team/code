-- Recreate services table: add db type + db_type column
CREATE TABLE services_new (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT,
  type TEXT NOT NULL CHECK(type IN ('http', 'push', 'db')),
  method TEXT NOT NULL DEFAULT 'GET',
  expected_status INTEGER NOT NULL DEFAULT 200,
  timeout_ms INTEGER NOT NULL DEFAULT 10000,
  push_interval_ms INTEGER NOT NULL DEFAULT 60000,
  fail_threshold INTEGER NOT NULL DEFAULT 2,
  group_name TEXT NOT NULL DEFAULT 'Services',
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  db_type TEXT
);

INSERT INTO services_new (id, name, url, type, method, expected_status, timeout_ms, push_interval_ms, fail_threshold, group_name, enabled, created_at)
SELECT id, name, url, type, method, expected_status, timeout_ms, push_interval_ms, fail_threshold, group_name, enabled, created_at FROM services;

DROP TABLE services;
ALTER TABLE services_new RENAME TO services;

-- Recreate incidents: nullable service_id, add type/title, drop Telegram columns
CREATE TABLE incidents_new (
  id TEXT PRIMARY KEY,
  service_id TEXT,
  started_at INTEGER NOT NULL,
  resolved_at INTEGER,
  type TEXT NOT NULL DEFAULT 'auto',
  title TEXT,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
);

INSERT INTO incidents_new (id, service_id, started_at, resolved_at)
SELECT id, service_id, started_at, resolved_at FROM incidents;

DROP TABLE incidents;
ALTER TABLE incidents_new RENAME TO incidents;

CREATE INDEX IF NOT EXISTS idx_incidents_service ON incidents(service_id);
CREATE INDEX IF NOT EXISTS idx_incidents_unresolved ON incidents(resolved_at) WHERE resolved_at IS NULL;

-- Drop Telegram bot state
DROP TABLE IF EXISTS bot_state;
