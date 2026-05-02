import { db, errors, projects, serverMetadata } from '@bx-team/stratus';
import { and, count, eq } from 'drizzle-orm';

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

	const [errorCount] = await db.select({ total: count() }).from(errors).where(eq(errors.projectId, id));

	let timeseries: unknown[] = [];

	if (project.type === 'server') {
		const result = await clickhouse.query({
			query: `
				SELECT
					${range.bucket}(timestamp) AS time,
					avg(online)       AS online,
					avg(tps)          AS tps,
					avg(mspt)         AS mspt,
					avg(memory_used)  AS memory_used
				FROM server_stats
				WHERE project_id = {projectId: String}
					AND timestamp >= now() - INTERVAL ${range.interval}
				GROUP BY time
				ORDER BY time
			`,
			query_params: { projectId: id },
			format: 'JSONEachRow',
		});
		timeseries = await result.json();
	}

	return {
		project: { id: project.id, name: project.name, type: project.type, slug: project.slug },
		metadata: metadata ?? null,
		timeseries,
		summary: { totalErrors: errorCount?.total ?? 0 },
		range: rangeKey,
	};
});
