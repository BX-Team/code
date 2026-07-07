import { alertRules, createPulsifyDb, projects } from '@bx-team/stratus/d1';
import { and, eq } from 'drizzle-orm';
import type { Env } from '../env';
import { type AlertPayload, deliver } from './alerts';

/**
 * Evaluates `error_spike` rules on the cron tick — unlike new-issue and regression alerts,
 * a volume threshold can't be judged from a single event at ingest. Counts come from the AE
 * `errors` dataset via the SQL API; each rule fires at most once per window (`lastFiredAt`).
 */
export async function evaluateSpikes(env: Env): Promise<void> {
  const db = createPulsifyDb(env.PULSIFY_DB);
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

    const count = await queryErrorCount(env, rule.projectId, rule.windowMinutes);
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

async function queryErrorCount(env: Env, projectId: string, windowMinutes: number): Promise<number> {
  const sql = `SELECT count() AS c FROM errors WHERE index1 = '${projectId}' AND timestamp >= NOW() - INTERVAL '${windowMinutes}' MINUTE`;
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${env.ACCOUNT_ID}/analytics_engine/sql`, {
    method: 'POST',
    headers: { authorization: `Bearer ${env.AE_SQL_TOKEN}`, 'content-type': 'text/plain' },
    body: sql,
  });
  if (!res.ok) {
    console.error(`[spikes] AE SQL query responded ${res.status}`);
    return 0;
  }
  const data = (await res.json()) as { data?: Array<{ c: number | string }> };
  return Number(data.data?.[0]?.c ?? 0);
}
