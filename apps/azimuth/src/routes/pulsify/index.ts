import { createPulsifyDb, issues, projects, quotas, serverMetadata } from '@bx-team/stratus/d1';
import { and, eq, inArray, ne } from 'drizzle-orm';
import { Hono } from 'hono';
import type { Env } from '../../env';
import { aeQuery, sqlStringList } from '../../lib/analytics-sql';
import { RANGES, rangeFromQuery } from '../../lib/pulsify';
import { requireAuth, type SessionVariables } from '../../middleware/auth';
import { alertRoutes } from './alerts';
import { analyticsRoutes } from './analytics';
import { errorRoutes } from './errors';
import { metricRoutes } from './metrics';
import { projectRoutes } from './projects';
import { tokenRoutes } from './tokens';

type PulsifyEnv = { Bindings: Env; Variables: SessionVariables };

/**
 * Pulsify route group — backed by pulsify-db, the Analytics Engine SQL API and the R2
 * error-payload archive. Every route runs behind the shared Better Auth session check;
 * widgets that need data from more than one store issue parallel queries and merge app-side.
 */
export const pulsify = new Hono<PulsifyEnv>();

pulsify.use('*', requireAuth);

pulsify.onError((err, c) => {
  console.error(`[pulsify] ${c.req.method} ${c.req.path}:`, err);
  return c.json({ message: 'Internal Server Error' }, 500);
});

pulsify.get('/overview', async c => {
  const session = c.get('authSession');
  if (!session) return c.json({ message: 'Unauthorized' }, 401);
  const db = createPulsifyDb(c.env.PULSIFY_DB);
  const rangeKey = rangeFromQuery(c.req.query('range'), '7d');
  const range = RANGES[rangeKey];

  const ownedProjects = await db
    .select({ id: projects.id, type: projects.type, name: projects.name, slug: projects.slug })
    .from(projects)
    .where(eq(projects.ownerId, session.user.id));

  const projectIds = ownedProjects.map(p => p.id);
  const serverIds = ownedProjects.filter(p => p.type === 'server').map(p => p.id);

  if (!projectIds.length) {
    return c.json({
      summary: {
        projects: 0,
        servers: 0,
        plugins: 0,
        mods: 0,
        totalErrors: 0,
        totalEvents24h: 0,
        peakOnline24h: 0,
        uniquePlayers24h: 0,
      },
      timeseries: [],
      projects: [],
      range: rangeKey,
    });
  }

  // Anything not 'open' (resolved / ignored / muted) is suppressed from the active error count.
  const suppressedRows = await db
    .select({ projectId: issues.projectId, fingerprint: issues.fingerprint })
    .from(issues)
    .where(and(inArray(issues.projectId, projectIds), ne(issues.status, 'open')));

  const suppressedByProject = new Map<string, Set<string>>();
  for (const row of suppressedRows) {
    if (!suppressedByProject.has(row.projectId)) suppressedByProject.set(row.projectId, new Set());
    suppressedByProject.get(row.projectId)?.add(row.fingerprint);
  }

  const [eventsResult, peakResult, playersResult, timeseriesRows] = await Promise.all([
    // Events span every project type; peak-online and sessions are server-only.
    aeQuery<{ total: number }>(
      c.env,
      `SELECT SUM(_sample_interval) AS total
       FROM events
       WHERE index1 IN (${sqlStringList(projectIds)}) AND timestamp >= NOW() - INTERVAL '24' HOUR`,
    ).catch(() => []),
    serverIds.length
      ? aeQuery<{ peak: number }>(
          c.env,
          `SELECT MAX(double1) AS peak
           FROM server_stats
           WHERE index1 IN (${sqlStringList(serverIds)}) AND timestamp >= NOW() - INTERVAL '24' HOUR`,
        ).catch(() => [])
      : Promise.resolve([]),
    serverIds.length
      ? aeQuery<{ players: number }>(
          c.env,
          `SELECT COUNT(DISTINCT blob1) AS players
           FROM sessions
           WHERE index1 IN (${sqlStringList(serverIds)}) AND timestamp >= NOW() - INTERVAL '24' HOUR`,
        ).catch(() => [])
      : Promise.resolve([]),
    serverIds.length
      ? aeQuery<{ time: string; project_id: string; online: number; tps: number }>(
          c.env,
          `SELECT
             ${range.bucket}(timestamp) AS time,
             index1 AS project_id,
             MAX(double1) AS online,
             AVG(double2) AS tps
           FROM server_stats
           WHERE index1 IN (${sqlStringList(serverIds)}) AND timestamp >= NOW() - ${range.interval}
           GROUP BY time, project_id
           ORDER BY time`,
        ).catch(() => [])
      : Promise.resolve([]),
  ]);

  // AE can't nest aggregations, so the per-project bucket rows are merged here:
  // summed online across servers, averaged tps.
  const byTime = new Map<string, { online: number; tpsSum: number; buckets: number }>();
  for (const row of timeseriesRows) {
    const entry = byTime.get(row.time) ?? { online: 0, tpsSum: 0, buckets: 0 };
    entry.online += Number(row.online);
    entry.tpsSum += Number(row.tps);
    entry.buckets += 1;
    byTime.set(row.time, entry);
  }
  const timeseries = [...byTime.entries()].map(([time, v]) => ({
    time,
    online: v.online,
    tps: v.buckets > 0 ? v.tpsSum / v.buckets : 0,
  }));

  const [lastSeen, errorsByProjectRows] = await Promise.all([
    db
      .select({
        projectId: serverMetadata.projectId,
        lastSeenAt: serverMetadata.lastSeenAt,
        software: serverMetadata.software,
        mcVersion: serverMetadata.mcVersion,
        countryCode: serverMetadata.countryCode,
      })
      .from(serverMetadata)
      .where(inArray(serverMetadata.projectId, projectIds)),
    aeQuery<{ project_id: string; fingerprint: string }>(
      c.env,
      `SELECT index1 AS project_id, blob3 AS fingerprint
       FROM errors
       WHERE index1 IN (${sqlStringList(projectIds)}) AND blob3 != ''
       GROUP BY project_id, fingerprint`,
    ).catch(() => []),
  ]);

  const metaByProject = new Map(lastSeen.map(m => [m.projectId, m]));
  const errorsByProjectMap = new Map<string, number>();
  for (const row of errorsByProjectRows) {
    if (suppressedByProject.get(row.project_id)?.has(row.fingerprint)) continue;
    errorsByProjectMap.set(row.project_id, (errorsByProjectMap.get(row.project_id) ?? 0) + 1);
  }
  const totalErrors = [...errorsByProjectMap.values()].reduce((s, n) => s + n, 0);

  const enrichedProjects = ownedProjects.map(p => ({
    ...p,
    lastSeenAt: metaByProject.get(p.id)?.lastSeenAt ?? null,
    software: metaByProject.get(p.id)?.software ?? null,
    mcVersion: metaByProject.get(p.id)?.mcVersion ?? null,
    errors: errorsByProjectMap.get(p.id) ?? 0,
  }));

  return c.json({
    summary: {
      projects: ownedProjects.length,
      servers: ownedProjects.filter(p => p.type === 'server').length,
      plugins: ownedProjects.filter(p => p.type === 'plugin').length,
      mods: ownedProjects.filter(p => p.type === 'mod').length,
      totalErrors,
      totalEvents24h: Number(eventsResult[0]?.total ?? 0),
      peakOnline24h: Number(peakResult[0]?.peak ?? 0),
      uniquePlayers24h: Number(playersResult[0]?.players ?? 0),
    },
    timeseries,
    projects: enrichedProjects,
    range: rangeKey,
  });
});

pulsify.get('/billing', async c => {
  const session = c.get('authSession');
  if (!session) return c.json({ message: 'Unauthorized' }, 401);
  const db = createPulsifyDb(c.env.PULSIFY_DB);
  const userId = session.user.id;

  let [quota] = await db.select().from(quotas).where(eq(quotas.userId, userId));
  if (!quota) {
    [quota] = await db.insert(quotas).values({ userId }).onConflictDoNothing().returning();
    if (!quota) {
      [quota] = await db.select().from(quotas).where(eq(quotas.userId, userId));
    }
  }

  const ownedProjects = await db.select({ id: projects.id }).from(projects).where(eq(projects.ownerId, userId));
  const projectIds = ownedProjects.map(p => p.id);

  let eventsToday = 0;
  if (projectIds.length > 0) {
    const rows = await aeQuery<{ total: number }>(
      c.env,
      `SELECT SUM(_sample_interval) AS total
       FROM events
       WHERE index1 IN (${sqlStringList(projectIds)}) AND timestamp >= toStartOfDay(NOW())`,
    );
    eventsToday = Number(rows[0]?.total ?? 0);
  }

  return c.json({
    plan: 'free',
    limits: {
      maxProjects: quota?.maxProjects ?? 10,
      maxEventsPerDay: quota?.maxEventsPerDay ?? 100000,
    },
    usage: {
      projects: projectIds.length,
      eventsToday,
    },
  });
});

pulsify.route('/', projectRoutes);
pulsify.route('/', analyticsRoutes);
pulsify.route('/', errorRoutes);
pulsify.route('/', metricRoutes);
pulsify.route('/', tokenRoutes);
pulsify.route('/', alertRoutes);
