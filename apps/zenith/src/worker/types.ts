export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  RATE_LIMITER_HEARTBEAT: RateLimit;
  RATE_LIMITER_API: RateLimit;
  RATE_LIMITER_ADMIN: RateLimit;
  HEARTBEAT_SECRET: string;
  ADMIN_KEY: string;
}

export type ServiceType = 'http' | 'push' | 'db';
export type IncidentType = 'auto' | 'manual' | 'maintenance';

export interface Service {
  id: string;
  name: string;
  url: string | null;
  type: ServiceType;
  method: string;
  expected_status: number;
  timeout_ms: number;
  push_interval_ms: number;
  fail_threshold: number;
  group_name: string;
  enabled: number;
  created_at: number;
  db_type: string | null;
}

export interface ServiceStatus {
  service_id: string;
  is_up: number;
  last_check_at: number | null;
  last_response_ms: number | null;
  last_heartbeat_at: number | null;
  consecutive_failures: number;
}

export interface ServiceWithStatus extends Service {
  status: ServiceStatus | null;
}

export interface Incident {
  id: string;
  service_id: string | null;
  started_at: number;
  resolved_at: number | null;
  type: IncidentType;
  title: string | null;
}

export interface CheckResult {
  service: Service;
  previousStatus: ServiceStatus | null;
  isUp: boolean;
  responseMs: number | null;
  error?: string;
}

export interface UptimeDay {
  date: string;
  checks_total: number;
  checks_ok: number;
}
