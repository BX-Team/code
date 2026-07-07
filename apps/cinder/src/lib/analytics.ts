import type { Env } from '../env';

/**
 * Analytics Engine write helpers. Each dataset uses `project_id` as its single index;
 * blobs carry dimensions, doubles carry measures. AE caps total blob size per data point
 * (16 KB), so long text (raw stacktraces) goes to R2 instead — see error-payloads.ts.
 */

const MAX_PROPERTIES_BLOB = 5_000;
const MAX_MESSAGE_BLOB = 1_000;

function truncate(value: string, max: number): string {
  return value.length > max ? value.slice(0, max) : value;
}

/** Raw event mirror → AE `events`. */
export function writeEvent(env: Env, projectId: string, eventType: string, event: unknown): void {
  env.AE_EVENTS.writeDataPoint({
    indexes: [projectId],
    blobs: [eventType, truncate(JSON.stringify(event), MAX_PROPERTIES_BLOB)],
  });
}

export function writeServerStats(
  env: Env,
  projectId: string,
  s: { online: number; tps: number; mspt: number; memoryUsed: number; memoryMax: number },
): void {
  env.AE_SERVER_STATS.writeDataPoint({
    indexes: [projectId],
    doubles: [s.online, s.tps, s.mspt, s.memoryUsed, s.memoryMax],
  });
}

export function writeError(
  env: Env,
  projectId: string,
  e: {
    plugin: string;
    level: string;
    fingerprint: string;
    serverVersion: string;
    serverSoftware: string;
    message: string;
    pluginVersion: string;
  },
): void {
  env.AE_ERRORS.writeDataPoint({
    indexes: [projectId],
    blobs: [
      e.plugin,
      e.level,
      e.fingerprint,
      e.serverVersion,
      e.serverSoftware,
      truncate(e.message, MAX_MESSAGE_BLOB),
      e.pluginVersion,
    ],
    doubles: [1],
  });
}

export function writeSession(
  env: Env,
  projectId: string,
  s: { playerUuid: string; clientVersion: string; countryCode: string; durationSeconds: number; abandoned: boolean },
): void {
  env.AE_SESSIONS.writeDataPoint({
    indexes: [projectId],
    blobs: [s.playerUuid, s.clientVersion, s.countryCode, s.abandoned ? '1' : '0'],
    doubles: [s.durationSeconds],
  });
}

/**
 * Custom metric → AE `custom_metrics`. AE has no map type, so the first few label
 * values fill reserved blob slots (filterable) and the full label set is stored as
 * a JSON blob for display only.
 */
export function writeMetric(
  env: Env,
  projectId: string,
  m: { name: string; value: number; labels: Record<string, string> },
): void {
  const entries = Object.entries(m.labels).sort(([a], [b]) => a.localeCompare(b));
  const slots: string[] = [0, 1, 2].map(i => {
    const entry = entries[i];
    return entry ? `${entry[0]}=${entry[1]}` : '';
  });
  env.AE_CUSTOM_METRICS.writeDataPoint({
    indexes: [projectId],
    blobs: [m.name, ...slots, truncate(JSON.stringify(m.labels), MAX_PROPERTIES_BLOB)],
    doubles: [m.value],
  });
}
