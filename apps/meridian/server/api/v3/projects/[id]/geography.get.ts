import { db, projects } from '@bx-team/stratus';
import { and, eq } from 'drizzle-orm';

const RANGES = {
  '24h': '24 HOUR',
  '7d': '7 DAY',
  '30d': '30 DAY',
} as const;

type RangeKey = keyof typeof RANGES;

export default defineEventHandler(async event => {
  const session = await requireAuth(event);
  const id = requireParam(event, 'id');
  const query = getQuery(event);
  const rangeKey = (typeof query.range === 'string' && query.range in RANGES ? query.range : '24h') as RangeKey;

  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.ownerId, session.user.id)));

  if (!project) throw createError({ statusCode: 404, message: 'Project not found' });

  const result = await clickhouse.query({
    query: `
			SELECT country_code, count() AS count
			FROM player_sessions FINAL
			WHERE project_id = {projectId: String}
				AND joined_at >= now() - INTERVAL ${RANGES[rangeKey]}
			GROUP BY country_code
			ORDER BY count DESC
			LIMIT 20
		`,
    query_params: { projectId: id },
    format: 'JSONEachRow',
  });

  const rows = await result.json<{ country_code: string; count: string }>();
  const total = rows.reduce((s, r) => s + Number(r.count), 0);

  return {
    countries: rows.map(r => ({
      code: r.country_code || 'Unknown',
      count: Number(r.count),
      pct: total > 0 ? Math.round((Number(r.count) / total) * 1000) / 10 : 0,
    })),
    total,
  };
});
