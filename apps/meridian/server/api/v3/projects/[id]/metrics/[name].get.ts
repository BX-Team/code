import { db, projects } from '@bx-team/stratus';
import { and, eq } from 'drizzle-orm';

const RANGES = {
  '24h': { interval: '24 HOUR', bucket: 'toStartOfFifteenMinutes' },
  '7d': { interval: '7 DAY', bucket: 'toStartOfHour' },
  '30d': { interval: '30 DAY', bucket: 'toStartOfDay' },
} as const;

export default defineEventHandler(async event => {
  const session = await requireAuth(event);
  const id = requireParam(event, 'id');
  const name = requireParam(event, 'name');
  const query = getQuery(event);
  const rangeKey = (
    typeof query.range === 'string' && query.range in RANGES ? query.range : '7d'
  ) as keyof typeof RANGES;
  const range = RANGES[rangeKey];

  const [project] = await db
    .select({ id: projects.id, type: projects.type })
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.ownerId, session.user.id)));

  if (!project) throw createError({ statusCode: 404, message: 'Project not found' });

  const decodedName = decodeURIComponent(name);
  const queryParams = { projectId: id, metricName: decodedName };

  const [seriesResult, labelsResult] = await Promise.all([
    clickhouse.query({
      query: `
        SELECT
          ${range.bucket}(timestamp) AS time,
          avg(value)  AS avg_value,
          max(value)  AS max_value,
          min(value)  AS min_value,
          count()     AS point_count
        FROM custom_metrics
        WHERE project_id = {projectId: String}
          AND name = {metricName: String}
          AND timestamp >= now() - INTERVAL ${range.interval}
        GROUP BY time
        ORDER BY time
      `,
      query_params: queryParams,
      format: 'JSONEachRow',
    }),
    // Breakdown of the metric's total value by each label key/value, so the UI can render
    // bar/pie charts grouped by labels (e.g. value per "world", per "biome").
    clickhouse.query({
      query: `
        SELECT
          label_key,
          labels[label_key] AS label_value,
          sum(value)        AS total,
          count()           AS point_count
        FROM custom_metrics
        ARRAY JOIN mapKeys(labels) AS label_key
        WHERE project_id = {projectId: String}
          AND name = {metricName: String}
          AND timestamp >= now() - INTERVAL ${range.interval}
        GROUP BY label_key, label_value
        ORDER BY label_key, total DESC
      `,
      query_params: queryParams,
      format: 'JSONEachRow',
    }),
  ]);

  const series = (await seriesResult.json()) as Array<{
    time: string;
    avg_value: string;
    max_value: string;
    min_value: string;
    point_count: string;
  }>;

  const labelRows = (await labelsResult.json()) as Array<{
    label_key: string;
    label_value: string;
    total: string;
    point_count: string;
  }>;

  // Group flat label rows into one breakdown per label key.
  const breakdownMap = new Map<string, Array<{ value: string; total: number; count: number }>>();
  for (const r of labelRows) {
    let bucket = breakdownMap.get(r.label_key);
    if (!bucket) {
      bucket = [];
      breakdownMap.set(r.label_key, bucket);
    }
    bucket.push({ value: r.label_value, total: Number(r.total), count: Number(r.point_count) });
  }

  return {
    name: decodedName,
    range: rangeKey,
    series: series.map(p => ({
      time: p.time,
      avg: Number(p.avg_value),
      max: Number(p.max_value),
      min: Number(p.min_value),
      count: Number(p.point_count),
    })),
    labels: [...breakdownMap.entries()].map(([key, values]) => ({ key, values })),
  };
});
