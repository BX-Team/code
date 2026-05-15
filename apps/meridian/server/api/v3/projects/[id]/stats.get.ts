import { db, projects, serverMetadata } from '@bx-team/stratus';
import { and, eq } from 'drizzle-orm';

const RANGES = {
  '24h': { interval: '24 HOUR', bucket: 'toStartOfFiveMinutes' },
  '7d': { interval: '7 DAY', bucket: 'toStartOfHour' },
  '30d': { interval: '30 DAY', bucket: 'toStartOfHour' },
} as const;

type RangeKey = keyof typeof RANGES;

export default defineEventHandler(async event => {
  const session = await requireAuth(event);
  const id = requireParam(event, 'id');
  const query = getQuery(event);
  const rangeKey = (typeof query.range === 'string' && query.range in RANGES ? query.range : '24h') as RangeKey;
  const range = RANGES[rangeKey];

  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.ownerId, session.user.id)));

  if (!project) throw createError({ statusCode: 404, message: 'Project not found' });

  const [metadata] = await db.select().from(serverMetadata).where(eq(serverMetadata.projectId, id));

  let timeseries: unknown[] = [];
  let totalErrors = 0;

  const [errorCountResult, timeseriesResult] = await Promise.all([
    clickhouse.query({
      query: `SELECT count() AS total FROM error_events WHERE project_id = {projectId: String}`,
      query_params: { projectId: id },
      format: 'JSONEachRow',
    }),
    project.type === 'server'
      ? clickhouse.query({
          query: `
            SELECT
              ${range.bucket}(timestamp) AS time,
              max(online)       AS online,
              avg(tps)          AS tps,
              avg(mspt)         AS mspt,
              max(memory_used)  AS memory_used,
              max(memory_max)   AS memory_max
            FROM server_stats
            WHERE project_id = {projectId: String}
              AND timestamp >= now() - INTERVAL ${range.interval}
            GROUP BY time
            ORDER BY time
          `,
          query_params: { projectId: id },
          format: 'JSONEachRow',
        })
      : null,
  ]);

  const [errorCountRow] = (await errorCountResult.json()) as Array<{ total: string }>;
  totalErrors = Number(errorCountRow?.total ?? 0);

  if (timeseriesResult) {
    timeseries = await timeseriesResult.json();
  }

  return {
    project: { id: project.id, name: project.name, type: project.type, slug: project.slug },
    metadata: metadata ?? null,
    timeseries,
    summary: { totalErrors },
    range: rangeKey,
  };
});
