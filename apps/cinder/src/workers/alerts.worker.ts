import { alertRules, db, projects } from '@bx-team/stratus';
import { and, eq } from 'drizzle-orm';
import { env } from '../env';
import { type AlertPayload, deliver } from '../lib/alerts';
import { clickhouse } from '../lib/clickhouse';

const TICK_MS = 60_000;

/**
 * Evaluates `error_spike` rules against ClickHouse on a fixed cadence — unlike new-issue and
 * regression alerts, a volume threshold can't be judged from a single event at ingest. Each
 * rule fires at most once per its own window, throttled via `lastFiredAt`.
 */
async function evaluateSpikes(): Promise<void> {
  const rules = await db
    .select({
      id: alertRules.id,
      projectId: alertRules.projectId,
      threshold: alertRules.threshold,
      windowMinutes: alertRules.windowMinutes,
      webhookUrl: alertRules.webhookUrl,
      lastFiredAt: alertRules.lastFiredAt,
      name: projects.name,
      slug: projects.slug,
    })
    .from(alertRules)
    .innerJoin(projects, eq(alertRules.projectId, projects.id))
    .where(and(eq(alertRules.type, 'error_spike'), eq(alertRules.enabled, true)));

  const now = Date.now();
  const base = env.APP_URL.replace(/\/$/, '');

  for (const rule of rules) {
    if (rule.lastFiredAt && now - rule.lastFiredAt.getTime() < rule.windowMinutes * 60_000) continue;

    const result = await clickhouse.query({
      query: `
        SELECT count() AS c
        FROM error_events
        WHERE project_id = {pid: String}
          AND timestamp >= now() - ({mins: UInt32} * 60)
      `,
      query_params: { pid: rule.projectId, mins: rule.windowMinutes },
      format: 'JSONEachRow',
    });
    const [row] = await result.json<{ c: string }[]>();
    const count = Number(row?.c ?? 0);
    if (count < rule.threshold) continue;

    const payload: AlertPayload = {
      type: 'error_spike',
      project: { name: rule.name, slug: rule.slug },
      title: 'Error spike',
      message: `${count} errors in the last ${rule.windowMinutes} minutes (threshold ${rule.threshold}).`,
      count,
      windowMinutes: rule.windowMinutes,
      url: `${base}/dashboard/${rule.slug}/errors`,
      timestamp: new Date().toISOString(),
    };

    await deliver(rule.webhookUrl, payload);
    await db.update(alertRules).set({ lastFiredAt: new Date() }).where(eq(alertRules.id, rule.id));
  }
}

export function startAlertsWorker(): ReturnType<typeof setInterval> {
  const tick = () => evaluateSpikes().catch(err => console.error('[alerts] spike eval failed:', err));
  const interval = setInterval(tick, TICK_MS);
  return interval;
}
