import { db, projects } from '@bx-team/stratus';
import { and, eq } from 'drizzle-orm';

export default defineEventHandler(async event => {
  const session = await requireAuth(event);
  const id = requireParam(event, 'id');
  const query = getQuery(event);
  const range = (typeof query.range === 'string' && ['24h', '7d', '30d'].includes(query.range) ? query.range : '7d') as
    | '24h'
    | '7d'
    | '30d';
  const INTERVALS: Record<string, string> = { '24h': '24 HOUR', '7d': '7 DAY', '30d': '30 DAY' };

  const [project] = await db
    .select({ id: projects.id, type: projects.type })
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.ownerId, session.user.id)));

  if (!project) throw createError({ statusCode: 404, message: 'Project not found' });
  if (project.type === 'server')
    throw createError({ statusCode: 400, message: 'Metrics are only available for plugin/mod projects' });

  const namesResult = await clickhouse.query({
    query: `
      SELECT
        name,
        count()    AS total_points,
        max(value) AS max_value,
        min(value) AS min_value,
        avg(value) AS avg_value,
        max(timestamp) AS last_seen_at
      FROM custom_metrics
      WHERE project_id = {projectId: String}
        AND timestamp >= now() - INTERVAL ${INTERVALS[range]}
      GROUP BY name
      ORDER BY name
    `,
    query_params: { projectId: id },
    format: 'JSONEachRow',
  });

  const names = (await namesResult.json()) as Array<{
    name: string;
    total_points: string;
    max_value: string;
    min_value: string;
    avg_value: string;
    last_seen_at: string;
  }>;

  return {
    metrics: names.map(n => ({
      name: n.name,
      totalPoints: Number(n.total_points),
      maxValue: Number(n.max_value),
      minValue: Number(n.min_value),
      avgValue: Number(n.avg_value),
      lastSeenAt: n.last_seen_at,
    })),
    range,
  };
});
