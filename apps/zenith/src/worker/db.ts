import type { Incident, IncidentType, Service, ServiceStatus, ServiceWithStatus, UptimeDay } from './types';

export async function loadServicesWithStatus(db: D1Database): Promise<ServiceWithStatus[]> {
  const result = await db
    .prepare(
      `SELECT s.*, ss.is_up, ss.last_check_at, ss.consecutive_failures
       FROM services s
       LEFT JOIN service_status ss ON s.id = ss.service_id
       WHERE s.enabled = 1
       ORDER BY s.group_name, s.name`,
    )
    .all<Service & Partial<ServiceStatus>>();

  return (result.results ?? []).map(row => {
    const { is_up, last_check_at, consecutive_failures, ...service } = row;
    const status: ServiceStatus | null =
      is_up !== undefined
        ? {
            service_id: service.id,
            is_up: is_up!,
            last_check_at: last_check_at ?? null,
            consecutive_failures: consecutive_failures ?? 0,
          }
        : null;
    return { ...service, status } as ServiceWithStatus;
  });
}

export async function upsertServiceStatuses(db: D1Database, statuses: ServiceStatus[]): Promise<void> {
  if (statuses.length === 0) return;
  const stmts = statuses.map(s =>
    db
      .prepare(
        `INSERT INTO service_status (service_id, is_up, last_check_at, consecutive_failures)
       VALUES (?1, ?2, ?3, ?4)
       ON CONFLICT(service_id) DO UPDATE SET
         is_up = excluded.is_up,
         last_check_at = COALESCE(excluded.last_check_at, last_check_at),
         consecutive_failures = excluded.consecutive_failures`,
      )
      .bind(s.service_id, s.is_up, s.last_check_at, s.consecutive_failures),
  );
  await db.batch(stmts);
}

export async function loadActiveIncidents(db: D1Database): Promise<Incident[]> {
  const result = await db.prepare(`SELECT * FROM incidents WHERE resolved_at IS NULL`).all<Incident>();
  return result.results ?? [];
}

export async function loadIncidentHistory(db: D1Database, days = 7): Promise<Incident[]> {
  const since = Date.now() - days * 86400000;
  const result = await db
    .prepare(`SELECT * FROM incidents WHERE started_at >= ?1 ORDER BY started_at DESC`)
    .bind(since)
    .all<Incident>();
  return result.results ?? [];
}

export async function createIncident(db: D1Database, serviceId: string): Promise<Incident> {
  const id = crypto.randomUUID();
  const now = Date.now();
  await db
    .prepare(`INSERT INTO incidents (id, service_id, started_at, type) VALUES (?1, ?2, ?3, 'auto')`)
    .bind(id, serviceId, now)
    .run();
  return { id, service_id: serviceId, started_at: now, resolved_at: null, type: 'auto', title: null };
}

export async function createManualIncident(
  db: D1Database,
  type: 'manual' | 'maintenance',
  serviceId: string | null,
  title: string | null,
): Promise<Incident> {
  const id = crypto.randomUUID();
  const now = Date.now();
  await db
    .prepare(`INSERT INTO incidents (id, service_id, started_at, type, title) VALUES (?1, ?2, ?3, ?4, ?5)`)
    .bind(id, serviceId, now, type, title)
    .run();
  return { id, service_id: serviceId, started_at: now, resolved_at: null, type, title };
}

export async function resolveIncident(db: D1Database, incidentId: string): Promise<void> {
  await db.prepare(`UPDATE incidents SET resolved_at = ?1 WHERE id = ?2`).bind(Date.now(), incidentId).run();
}

export async function getAllServices(db: D1Database): Promise<Service[]> {
  const result = await db.prepare(`SELECT * FROM services ORDER BY group_name, name`).all<Service>();
  return result.results ?? [];
}

export async function getServiceById(db: D1Database, id: string): Promise<Service | null> {
  return db.prepare(`SELECT * FROM services WHERE id = ?1`).bind(id).first<Service>();
}

export async function insertService(db: D1Database, service: Omit<Service, 'created_at'>): Promise<void> {
  await db
    .prepare(
      `INSERT INTO services (id, name, url, type, method, expected_status, timeout_ms, push_interval_ms, fail_threshold, group_name, enabled, created_at, db_type)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, 1, ?11, ?12)`,
    )
    .bind(
      service.id,
      service.name,
      service.url,
      service.type,
      service.method,
      service.expected_status,
      service.timeout_ms,
      service.push_interval_ms,
      service.fail_threshold,
      service.group_name,
      Date.now(),
      service.db_type ?? null,
    )
    .run();
}

export async function deleteService(db: D1Database, id: string): Promise<boolean> {
  const result = await db.prepare(`DELETE FROM services WHERE id = ?1`).bind(id).run();
  return (result.meta?.changes ?? 0) > 0;
}

export async function getGroupOrder(db: D1Database): Promise<string[] | null> {
  const row = await db.prepare(`SELECT value FROM settings WHERE key = 'group_order'`).first<{ value: string }>();
  if (!row) return null;
  try {
    return JSON.parse(row.value);
  } catch {
    return null;
  }
}

export async function setGroupOrder(db: D1Database, order: string[]): Promise<void> {
  await db
    .prepare(
      `INSERT INTO settings (key, value) VALUES ('group_order', ?1)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    )
    .bind(JSON.stringify(order))
    .run();
}

export async function updateHeartbeat(db: D1Database, serviceId: string): Promise<void> {
  await db
    .prepare(
      `INSERT INTO service_status (service_id, is_up, consecutive_failures, last_check_at)
       VALUES (?1, 1, 0, ?2)
       ON CONFLICT(service_id) DO UPDATE SET last_check_at = excluded.last_check_at, is_up = 1, consecutive_failures = 0`,
    )
    .bind(serviceId, Date.now())
    .run();
}

export async function recordUptimeCheck(db: D1Database, serviceId: string, date: string, isUp: boolean): Promise<void> {
  await db
    .prepare(
      `INSERT INTO uptime_daily (service_id, date, checks_total, checks_ok)
       VALUES (?1, ?2, 1, ?3)
       ON CONFLICT(service_id, date) DO UPDATE SET
         checks_total = checks_total + 1,
         checks_ok = checks_ok + excluded.checks_ok`,
    )
    .bind(serviceId, date, isUp ? 1 : 0)
    .run();
}

export async function loadUptimeHistory(db: D1Database, days = 90): Promise<Record<string, UptimeDay[]>> {
  const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const result = await db
    .prepare(
      `SELECT service_id, date, checks_total, checks_ok FROM uptime_daily WHERE date >= ?1 ORDER BY service_id, date`,
    )
    .bind(since)
    .all<{ service_id: string; date: string; checks_total: number; checks_ok: number }>();

  const history: Record<string, UptimeDay[]> = {};
  for (const row of result.results ?? []) {
    if (!history[row.service_id]) history[row.service_id] = [];
    history[row.service_id].push({ date: row.date, checks_total: row.checks_total, checks_ok: row.checks_ok });
  }
  return history;
}
