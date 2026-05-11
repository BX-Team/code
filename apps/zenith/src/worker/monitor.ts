import {
  createIncident,
  loadActiveIncidents,
  loadServicesWithStatus,
  recordUptimeCheck,
  resolveIncident,
  upsertServiceStatuses,
} from './db';
import type { CheckResult, Env, Incident, Service, ServiceStatus, ServiceWithStatus } from './types';

async function checkHttp(service: Service): Promise<CheckResult> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), service.timeout_ms);
    const resp = await fetch(service.url!, {
      method: service.method,
      signal: controller.signal,
      redirect: 'follow',
    });
    clearTimeout(timer);
    const isUp = resp.status === service.expected_status;
    return { service, previousStatus: null, isUp, error: isUp ? undefined : `HTTP ${resp.status}` };
  } catch (err) {
    return { service, previousStatus: null, isUp: false, error: String(err) };
  }
}

function checkPush(service: Service, status: ServiceStatus | null): CheckResult {
  const lastSeen = status?.last_check_at;
  if (!lastSeen) return { service, previousStatus: status, isUp: true };
  const age = Date.now() - lastSeen;
  const isUp = age < service.push_interval_ms * 2;
  return {
    service,
    previousStatus: status,
    isUp,
    error: isUp ? undefined : `No heartbeat for ${Math.round(age / 1000)}s`,
  };
}

export async function runChecks(env: Env, db: D1Database): Promise<void> {
  const [servicesWithStatus, activeIncidents] = await Promise.all([
    loadServicesWithStatus(db),
    loadActiveIncidents(db),
  ]);

  const incidentByService = new Map<string, Incident>();
  for (const inc of activeIncidents) {
    if (inc.service_id) incidentByService.set(inc.service_id, inc);
  }

  const checkPromises = servicesWithStatus.map(async (sws): Promise<CheckResult> => {
    const result = sws.type === 'http' ? await checkHttp(sws) : checkPush(sws, sws.status);
    result.previousStatus = sws.status;
    return result;
  });

  const results = await Promise.all(checkPromises);
  const now = Date.now();
  const today = new Date(now).toISOString().slice(0, 10);

  const updatedStatuses = results.map(r => {
    const prev = r.previousStatus;
    const consec = r.isUp ? 0 : (prev?.consecutive_failures ?? 0) + 1;
    return {
      service_id: r.service.id,
      is_up: r.isUp || consec < r.service.fail_threshold ? (r.isUp ? 1 : (prev?.is_up ?? 1)) : 0,
      last_check_at: r.service.type === 'http' ? now : null,
      consecutive_failures: consec,
    };
  });

  await upsertServiceStatuses(db, updatedStatuses);

  await Promise.all(results.map((r, i) => recordUptimeCheck(db, r.service.id, today, updatedStatuses[i].is_up === 1)));

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const updatedStatus = updatedStatuses[i];
    const service = result.service;
    const existingIncident = incidentByService.get(service.id);
    const isDown = updatedStatus.is_up === 0;

    if (isDown && !existingIncident && updatedStatus.consecutive_failures >= service.fail_threshold) {
      await createIncident(db, service.id);
    } else if (!isDown && existingIncident && existingIncident.type === 'auto') {
      await resolveIncident(db, existingIncident.id);
    }
  }
}
