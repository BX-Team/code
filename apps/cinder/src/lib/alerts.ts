import { alertRules, type PulsifyDb, projects } from '@bx-team/stratus/d1';
import { and, eq } from 'drizzle-orm';
import type { Env } from '../env';

export interface IssueNotice {
  projectId: string;
  kind: 'new_issue' | 'regression';
  plugin: string;
  message: string;
  level: string;
  fingerprint: string;
  version: string;
}

export interface AlertPayload {
  type: 'new_issue' | 'regression' | 'error_spike';
  project: { name: string; slug: string };
  title: string;
  message: string;
  level?: string;
  plugin?: string;
  version?: string;
  count?: number;
  windowMinutes?: number;
  url: string;
  timestamp: string;
}

const COLORS: Record<AlertPayload['type'], number> = {
  new_issue: 0xf59e0b,
  regression: 0xef4444,
  error_spike: 0xef4444,
};

const TITLES: Record<AlertPayload['type'], string> = {
  new_issue: 'New issue',
  regression: 'Regression',
  error_spike: 'Error spike',
};

export function dashboardUrl(env: Env, slug: string): string {
  return `${env.APP_URL.replace(/\/$/, '')}/dashboard/${slug}/errors`;
}

/** Fires `new_issue` / `regression` rules when the issue registry transitions at ingest. */
export async function notifyIssue(db: PulsifyDb, env: Env, notice: IssueNotice): Promise<void> {
  const rules = await db
    .select({ webhookUrl: alertRules.webhookUrl })
    .from(alertRules)
    .where(
      and(eq(alertRules.projectId, notice.projectId), eq(alertRules.type, notice.kind), eq(alertRules.enabled, true)),
    );
  if (rules.length === 0) return;

  const [project] = await db
    .select({ name: projects.name, slug: projects.slug })
    .from(projects)
    .where(eq(projects.id, notice.projectId));
  if (!project) return;

  const payload: AlertPayload = {
    type: notice.kind,
    project,
    title: TITLES[notice.kind],
    message: notice.message,
    level: notice.level,
    plugin: notice.plugin,
    version: notice.version || undefined,
    url: dashboardUrl(env, project.slug),
    timestamp: new Date().toISOString(),
  };

  await Promise.all(rules.map(r => deliver(r.webhookUrl, payload)));
}

const DISCORD_RE = /^https:\/\/(?:[a-z]+\.)?discord(?:app)?\.com\/api\/webhooks\//i;

/** Delivers an alert to a webhook URL, formatting as a Discord embed when the URL is a Discord hook. */
export async function deliver(url: string, payload: AlertPayload): Promise<void> {
  try {
    const body = DISCORD_RE.test(url) ? toDiscord(payload) : payload;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.error(`[alerts] webhook ${url} responded ${res.status}`);
    }
  } catch (err) {
    console.error('[alerts] delivery failed:', err);
  }
}

function toDiscord(p: AlertPayload) {
  const fields: Array<{ name: string; value: string; inline?: boolean }> = [];
  if (p.plugin) fields.push({ name: 'Plugin', value: p.plugin, inline: true });
  if (p.level) fields.push({ name: 'Level', value: p.level, inline: true });
  if (p.version) fields.push({ name: 'Version', value: p.version, inline: true });
  if (typeof p.count === 'number') {
    fields.push({ name: 'Events', value: `${p.count} in ${p.windowMinutes}m`, inline: true });
  }

  const description = p.message.length > 1800 ? `${p.message.slice(0, 1800)}…` : p.message;

  return {
    embeds: [
      {
        title: `${p.title} · ${p.project.name}`,
        description,
        url: p.url,
        color: COLORS[p.type],
        fields,
        timestamp: p.timestamp,
        footer: { text: 'Pulsify' },
      },
    ],
  };
}
