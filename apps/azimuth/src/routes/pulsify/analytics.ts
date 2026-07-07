import { createPulsifyDb, serverMetadata } from '@bx-team/stratus/d1';
import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import type { Env } from '../../env';
import { aeQuery, sqlDateTime, sqlString } from '../../lib/analytics-sql';
import { ownedProject, RANGES, rangeFromQuery } from '../../lib/pulsify';
import type { SessionVariables } from '../../middleware/auth';

type PulsifyEnv = { Bindings: Env; Variables: SessionVariables };

const DAY_MS = 86_400_000;

function startOfUtcDay(offsetDays: number): number {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime() + offsetDays * DAY_MS;
}

/**
 * Distinct player UUIDs seen in a session window. AE has no subqueries or JOINs, so
 * cohort/newcomer logic fetches per-window player sets and intersects them app-side.
 * Sessions are recorded at leave time; the AE row timestamp approximates joined_at.
 */
async function playerSet(env: Env, projectId: string, fromMs: number, toMs?: number): Promise<Set<string>> {
  const bounds = [`timestamp >= ${sqlDateTime(fromMs)}`];
  if (toMs !== undefined) bounds.push(`timestamp < ${sqlDateTime(toMs)}`);
  const rows = await aeQuery<{ player: string }>(
    env,
    `SELECT blob1 AS player
     FROM sessions
     WHERE index1 = ${sqlString(projectId)} AND ${bounds.join(' AND ')}
     GROUP BY player
     LIMIT 10000`,
  );
  return new Set(rows.map(r => r.player));
}

export const analyticsRoutes = new Hono<PulsifyEnv>();

analyticsRoutes.get('/projects/:id/stats', async c => {
  const session = c.get('authSession');
  if (!session) return c.json({ message: 'Unauthorized' }, 401);
  const db = createPulsifyDb(c.env.PULSIFY_DB);
  const id = c.req.param('id');
  const rangeKey = rangeFromQuery(c.req.query('range'), '24h');
  const range = RANGES[rangeKey];

  const project = await ownedProject(db, id, session.user.id);
  if (!project) return c.json({ message: 'Project not found' }, 404);

  const [metadata] = await db.select().from(serverMetadata).where(eq(serverMetadata.projectId, id));

  const [errorCountRows, timeseries] = await Promise.all([
    aeQuery<{ total: number }>(
      c.env,
      `SELECT SUM(_sample_interval) AS total FROM errors WHERE index1 = ${sqlString(id)}`,
    ),
    project.type === 'server'
      ? aeQuery(
          c.env,
          `SELECT
             ${range.bucket}(timestamp) AS time,
             MAX(double1) AS online,
             AVG(double2) AS tps,
             AVG(double3) AS mspt,
             MAX(double4) AS memory_used,
             MAX(double5) AS memory_max
           FROM server_stats
           WHERE index1 = ${sqlString(id)} AND timestamp >= NOW() - ${range.interval}
           GROUP BY time
           ORDER BY time`,
        )
      : Promise.resolve([]),
  ]);

  return c.json({
    project: { id: project.id, name: project.name, type: project.type, slug: project.slug },
    metadata: metadata ?? null,
    timeseries,
    summary: { totalErrors: Number(errorCountRows[0]?.total ?? 0) },
    range: rangeKey,
  });
});

analyticsRoutes.get('/projects/:id/players', async c => {
  const session = c.get('authSession');
  if (!session) return c.json({ message: 'Unauthorized' }, 401);
  const db = createPulsifyDb(c.env.PULSIFY_DB);
  const id = c.req.param('id');

  const project = await ownedProject(db, id, session.user.id);
  if (!project) return c.json({ message: 'Project not found' }, 404);

  const dayAgoMs = Date.now() - DAY_MS;

  const [sessionRows, uniqueRows, currentPlayers, priorPlayers] = await Promise.all([
    aeQuery<{
      player_uuid: string;
      client_version: string;
      country_code: string;
      duration_seconds: number;
      ended_at: string;
    }>(
      c.env,
      `SELECT
         blob1 AS player_uuid,
         blob2 AS client_version,
         blob3 AS country_code,
         double1 AS duration_seconds,
         timestamp AS ended_at
       FROM sessions
       WHERE index1 = ${sqlString(id)} AND timestamp >= NOW() - INTERVAL '24' HOUR
       ORDER BY ended_at DESC
       LIMIT 100`,
    ),
    aeQuery<{ unique_players: number }>(
      c.env,
      `SELECT COUNT(DISTINCT blob1) AS unique_players
       FROM sessions
       WHERE index1 = ${sqlString(id)} AND timestamp >= NOW() - INTERVAL '24' HOUR`,
    ),
    playerSet(c.env, id, dayAgoMs),
    playerSet(c.env, id, 0, dayAgoMs),
  ]);

  let newPlayers = 0;
  for (const player of currentPlayers) {
    if (!priorPlayers.has(player)) newPlayers++;
  }

  return c.json({
    // Sessions land in AE when they end; joined_at is reconstructed from end - duration.
    // AE returns DateTime columns as 'YYYY-MM-DD HH:MM:SS' UTC strings.
    sessions: sessionRows.map(row => ({
      player_uuid: row.player_uuid,
      joined_at: new Date(
        Date.parse(`${row.ended_at.replace(' ', 'T')}Z`) - Number(row.duration_seconds) * 1000,
      ).toISOString(),
      client_version: row.client_version,
      country_code: row.country_code,
    })),
    summary: {
      uniquePlayers: Number(uniqueRows[0]?.unique_players ?? 0),
      newPlayers,
    },
  });
});

analyticsRoutes.get('/projects/:id/geography', async c => {
  const session = c.get('authSession');
  if (!session) return c.json({ message: 'Unauthorized' }, 401);
  const db = createPulsifyDb(c.env.PULSIFY_DB);
  const id = c.req.param('id');
  const rangeKey = rangeFromQuery(c.req.query('range'), '24h');

  const project = await ownedProject(db, id, session.user.id);
  if (!project) return c.json({ message: 'Project not found' }, 404);

  const rows = await aeQuery<{ country_code: string; count: number }>(
    c.env,
    `SELECT blob3 AS country_code, SUM(_sample_interval) AS count
     FROM sessions
     WHERE index1 = ${sqlString(id)} AND timestamp >= NOW() - ${RANGES[rangeKey].interval}
     GROUP BY country_code
     ORDER BY count DESC
     LIMIT 20`,
  );

  const total = rows.reduce((s, r) => s + Number(r.count), 0);

  return c.json({
    countries: rows.map(r => ({
      code: r.country_code || 'Unknown',
      count: Number(r.count),
      pct: total > 0 ? Math.round((Number(r.count) / total) * 1000) / 10 : 0,
    })),
    total,
  });
});

analyticsRoutes.get('/projects/:id/client-versions', async c => {
  const session = c.get('authSession');
  if (!session) return c.json({ message: 'Unauthorized' }, 401);
  const db = createPulsifyDb(c.env.PULSIFY_DB);
  const id = c.req.param('id');
  const rangeKey = rangeFromQuery(c.req.query('range'), '24h');

  const project = await ownedProject(db, id, session.user.id);
  if (!project) return c.json({ message: 'Project not found' }, 404);

  const rows = await aeQuery<{ client_version: string; count: number }>(
    c.env,
    `SELECT blob2 AS client_version, SUM(_sample_interval) AS count
     FROM sessions
     WHERE index1 = ${sqlString(id)} AND timestamp >= NOW() - ${RANGES[rangeKey].interval}
     GROUP BY client_version
     ORDER BY count DESC
     LIMIT 20`,
  );

  const total = rows.reduce((s, r) => s + Number(r.count), 0);

  return c.json({
    versions: rows.map(r => ({
      version: r.client_version || 'Unknown',
      count: Number(r.count),
      pct: total > 0 ? Math.round((Number(r.count) / total) * 1000) / 10 : 0,
    })),
    total,
  });
});

analyticsRoutes.get('/projects/:id/session-duration', async c => {
  const session = c.get('authSession');
  if (!session) return c.json({ message: 'Unauthorized' }, 401);
  const db = createPulsifyDb(c.env.PULSIFY_DB);
  const id = c.req.param('id');
  const rangeKey = rangeFromQuery(c.req.query('range'), '24h');

  const project = await ownedProject(db, id, session.user.id);
  if (!project) return c.json({ message: 'Project not found' }, 404);

  // Completed sessions only: abandoned-session rows (blob4 = '1') are excluded from duration stats.
  const [row] = await aeQuery<{
    weighted_sum: number;
    median_seconds: number;
    bucket_0_5m: number;
    bucket_5_15m: number;
    bucket_15_30m: number;
    bucket_30_60m: number;
    bucket_60m_plus: number;
    total: number;
  }>(
    c.env,
    `SELECT
       SUM(double1 * _sample_interval) AS weighted_sum,
       quantileWeighted(0.5, double1, _sample_interval) AS median_seconds,
       sumIf(_sample_interval, double1 < 300) AS bucket_0_5m,
       sumIf(_sample_interval, double1 >= 300 AND double1 < 900) AS bucket_5_15m,
       sumIf(_sample_interval, double1 >= 900 AND double1 < 1800) AS bucket_15_30m,
       sumIf(_sample_interval, double1 >= 1800 AND double1 < 3600) AS bucket_30_60m,
       sumIf(_sample_interval, double1 >= 3600) AS bucket_60m_plus,
       SUM(_sample_interval) AS total
     FROM sessions
     WHERE index1 = ${sqlString(id)}
       AND timestamp >= NOW() - ${RANGES[rangeKey].interval}
       AND blob4 = '0'
       AND double1 > 0`,
  );

  const total = Number(row?.total ?? 0);

  const buckets = [
    { label: '0–5m', count: Number(row?.bucket_0_5m ?? 0) },
    { label: '5–15m', count: Number(row?.bucket_5_15m ?? 0) },
    { label: '15–30m', count: Number(row?.bucket_15_30m ?? 0) },
    { label: '30–60m', count: Number(row?.bucket_30_60m ?? 0) },
    { label: '60m+', count: Number(row?.bucket_60m_plus ?? 0) },
  ];

  return c.json({
    avg_seconds: total > 0 ? Math.round(Number(row?.weighted_sum ?? 0) / total) : 0,
    median_seconds: Number(row?.median_seconds ?? 0),
    total_sessions: total,
    distribution: buckets.map(b => ({
      ...b,
      pct: total > 0 ? Math.round((b.count / total) * 1000) / 10 : 0,
    })),
  });
});

analyticsRoutes.get('/projects/:id/retention', async c => {
  const session = c.get('authSession');
  if (!session) return c.json({ message: 'Unauthorized' }, 401);
  const db = createPulsifyDb(c.env.PULSIFY_DB);
  const id = c.req.param('id');

  const project = await ownedProject(db, id, session.user.id);
  if (!project) return c.json({ message: 'Project not found' }, 404);

  // Retention is four per-day player sets intersected app-side (AE has no JOINs).
  const [d1Cohort, d1Next, d7Cohort, d7Next] = await Promise.all([
    playerSet(c.env, id, startOfUtcDay(-2), startOfUtcDay(-1)),
    playerSet(c.env, id, startOfUtcDay(-1), startOfUtcDay(0)),
    playerSet(c.env, id, startOfUtcDay(-8), startOfUtcDay(-7)),
    playerSet(c.env, id, startOfUtcDay(-7), startOfUtcDay(-6)),
  ]);

  const retainedCount = (cohort: Set<string>, later: Set<string>) => {
    let retained = 0;
    for (const player of cohort) if (later.has(player)) retained++;
    return retained;
  };

  const d1Retained = retainedCount(d1Cohort, d1Next);
  const d7Retained = retainedCount(d7Cohort, d7Next);

  return c.json({
    d1: {
      cohort: d1Cohort.size,
      retained: d1Retained,
      pct: d1Cohort.size > 0 ? Math.round((d1Retained / d1Cohort.size) * 1000) / 10 : 0,
    },
    d7: {
      cohort: d7Cohort.size,
      retained: d7Retained,
      pct: d7Cohort.size > 0 ? Math.round((d7Retained / d7Cohort.size) * 1000) / 10 : 0,
    },
  });
});
