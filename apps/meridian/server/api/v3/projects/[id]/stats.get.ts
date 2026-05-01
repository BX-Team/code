import { db, errors, projects, serverMetadata } from '@bx-team/stratus';
import { and, count, eq } from 'drizzle-orm';

export default defineEventHandler(async event => {
  const session = await requireAuth(event);
  const id = requireParam(event, 'id');

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
          toStartOfFiveMinutes(timestamp) AS time,
          avg(online)       AS online,
          avg(tps)          AS tps,
          avg(mspt)         AS mspt,
          avg(memory_used)  AS memory_used
        FROM server_stats
        WHERE project_id = {projectId: String}
          AND timestamp >= now() - INTERVAL 24 HOUR
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
  };
});
