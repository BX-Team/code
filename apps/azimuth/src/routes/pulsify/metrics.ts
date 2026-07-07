import { createPulsifyDb } from '@bx-team/stratus/d1';
import { Hono } from 'hono';
import type { Env } from '../../env';
import { aeQuery, sqlString } from '../../lib/analytics-sql';
import { ownedProject, rangeFromQuery } from '../../lib/pulsify';
import type { SessionVariables } from '../../middleware/auth';

type PulsifyEnv = { Bindings: Env; Variables: SessionVariables };

const METRIC_RANGES = {
  '24h': { interval: "INTERVAL '24' HOUR", bucket: 'toStartOfFifteenMinutes' },
  '7d': { interval: "INTERVAL '7' DAY", bucket: 'toStartOfHour' },
  '30d': { interval: "INTERVAL '30' DAY", bucket: 'toStartOfDay' },
} as const;

/** The reserved label slots cinder writes as `key=value` strings. */
const LABEL_SLOTS = ['blob2', 'blob3', 'blob4'] as const;

export const metricRoutes = new Hono<PulsifyEnv>();

metricRoutes.get('/projects/:id/metrics', async c => {
  const session = c.get('authSession');
  if (!session) return c.json({ message: 'Unauthorized' }, 401);
  const db = createPulsifyDb(c.env.PULSIFY_DB);
  const id = c.req.param('id');
  const rangeKey = rangeFromQuery(c.req.query('range'), '7d');

  const project = await ownedProject(db, id, session.user.id);
  if (!project) return c.json({ message: 'Project not found' }, 404);
  if (project.type === 'server') {
    return c.json({ message: 'Metrics are only available for plugin/mod projects' }, 400);
  }

  const rows = await aeQuery<{
    name: string;
    total_points: number;
    max_value: number;
    min_value: number;
    avg_value: number;
    last_seen_at: string;
  }>(
    c.env,
    `SELECT
       blob1 AS name,
       SUM(_sample_interval) AS total_points,
       MAX(double1) AS max_value,
       MIN(double1) AS min_value,
       AVG(double1) AS avg_value,
       MAX(timestamp) AS last_seen_at
     FROM custom_metrics
     WHERE index1 = ${sqlString(id)} AND timestamp >= NOW() - ${METRIC_RANGES[rangeKey].interval}
     GROUP BY name
     ORDER BY name`,
  );

  return c.json({
    metrics: rows.map(n => ({
      name: n.name,
      totalPoints: Number(n.total_points),
      maxValue: Number(n.max_value),
      minValue: Number(n.min_value),
      avgValue: Number(n.avg_value),
      lastSeenAt: n.last_seen_at,
    })),
    range: rangeKey,
  });
});

metricRoutes.get('/projects/:id/metrics/:name', async c => {
  const session = c.get('authSession');
  if (!session) return c.json({ message: 'Unauthorized' }, 401);
  const db = createPulsifyDb(c.env.PULSIFY_DB);
  const id = c.req.param('id');
  const name = decodeURIComponent(c.req.param('name'));
  const rangeKey = rangeFromQuery(c.req.query('range'), '7d');
  const range = METRIC_RANGES[rangeKey];

  const project = await ownedProject(db, id, session.user.id);
  if (!project) return c.json({ message: 'Project not found' }, 404);

  const scope = `index1 = ${sqlString(id)} AND blob1 = ${sqlString(name)} AND timestamp >= NOW() - ${range.interval}`;

  // One query per reserved label slot; slot values are `key=value` strings regrouped app-side.
  const [series, ...slotRows] = await Promise.all([
    aeQuery<{ time: string; avg_value: number; max_value: number; min_value: number; point_count: number }>(
      c.env,
      `SELECT
         ${range.bucket}(timestamp) AS time,
         AVG(double1) AS avg_value,
         MAX(double1) AS max_value,
         MIN(double1) AS min_value,
         SUM(_sample_interval) AS point_count
       FROM custom_metrics
       WHERE ${scope}
       GROUP BY time
       ORDER BY time`,
    ),
    ...LABEL_SLOTS.map(slot =>
      aeQuery<{ label: string; total: number; point_count: number }>(
        c.env,
        `SELECT
           ${slot} AS label,
           SUM(double1 * _sample_interval) AS total,
           SUM(_sample_interval) AS point_count
         FROM custom_metrics
         WHERE ${scope} AND ${slot} != ''
         GROUP BY label
         ORDER BY total DESC`,
      ),
    ),
  ]);

  const breakdownMap = new Map<string, Array<{ value: string; total: number; count: number }>>();
  for (const row of slotRows.flat()) {
    const separator = row.label.indexOf('=');
    if (separator === -1) continue;
    const key = row.label.slice(0, separator);
    const value = row.label.slice(separator + 1);
    let bucket = breakdownMap.get(key);
    if (!bucket) {
      bucket = [];
      breakdownMap.set(key, bucket);
    }
    bucket.push({ value, total: Number(row.total), count: Number(row.point_count) });
  }
  for (const values of breakdownMap.values()) {
    values.sort((a, b) => b.total - a.total);
  }

  return c.json({
    name,
    range: rangeKey,
    series: series.map(p => ({
      time: p.time,
      avg: Number(p.avg_value),
      max: Number(p.max_value),
      min: Number(p.min_value),
      count: Number(p.point_count),
    })),
    labels: [...breakdownMap.entries()].map(([key, values]) => ({ key, values })),
  });
});
