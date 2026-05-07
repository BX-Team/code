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
			SELECT
				round(avg(duration_seconds), 0) AS avg_seconds,
				quantile(0.5)(duration_seconds)  AS median_seconds,
				countIf(duration_seconds < 300)                                    AS bucket_0_5m,
				countIf(duration_seconds >= 300  AND duration_seconds < 900)       AS bucket_5_15m,
				countIf(duration_seconds >= 900  AND duration_seconds < 1800)      AS bucket_15_30m,
				countIf(duration_seconds >= 1800 AND duration_seconds < 3600)      AS bucket_30_60m,
				countIf(duration_seconds >= 3600)                                  AS bucket_60m_plus,
				count() AS total
			FROM (
				SELECT dateDiff('second', joined_at, left_at) AS duration_seconds
				FROM player_sessions
				WHERE project_id = {projectId: String}
					AND joined_at >= now() - INTERVAL ${RANGES[rangeKey]}
					AND left_at IS NOT NULL
					AND left_at > joined_at
			)
		`,
    query_params: { projectId: id },
    format: 'JSONEachRow',
  });

  const [row] = await result.json<{
    avg_seconds: string;
    median_seconds: string;
    bucket_0_5m: string;
    bucket_5_15m: string;
    bucket_15_30m: string;
    bucket_30_60m: string;
    bucket_60m_plus: string;
    total: string;
  }>();

  const total = Number(row?.total ?? 0);

  const buckets = [
    { label: '0–5m', count: Number(row?.bucket_0_5m ?? 0) },
    { label: '5–15m', count: Number(row?.bucket_5_15m ?? 0) },
    { label: '15–30m', count: Number(row?.bucket_15_30m ?? 0) },
    { label: '30–60m', count: Number(row?.bucket_30_60m ?? 0) },
    { label: '60m+', count: Number(row?.bucket_60m_plus ?? 0) },
  ];

  return {
    avg_seconds: Number(row?.avg_seconds ?? 0),
    median_seconds: Number(row?.median_seconds ?? 0),
    total_sessions: total,
    distribution: buckets.map(b => ({
      ...b,
      pct: total > 0 ? Math.round((b.count / total) * 1000) / 10 : 0,
    })),
  };
});
