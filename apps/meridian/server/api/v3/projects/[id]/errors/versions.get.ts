import { db, projects } from '@bx-team/stratus';
import { and, eq } from 'drizzle-orm';

export default defineEventHandler(async event => {
  const session = await requireAuth(event);
  const id = requireParam(event, 'id');
  const query = getQuery(event);
  const fingerprint = typeof query.fingerprint === 'string' ? query.fingerprint : '';
  if (!fingerprint) throw createError({ statusCode: 400, message: 'Missing fingerprint' });

  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.ownerId, session.user.id)));
  if (!project) throw createError({ statusCode: 404, message: 'Project not found' });

  const result = await clickhouse.query({
    query: `
      SELECT
        plugin_version  AS version,
        count()         AS count,
        min(timestamp)  AS first_seen,
        max(timestamp)  AS last_seen
      FROM error_events
      WHERE project_id = {projectId: String} AND fingerprint = {fp: String}
      GROUP BY plugin_version
      ORDER BY count DESC
    `,
    query_params: { projectId: id, fp: fingerprint },
    format: 'JSONEachRow',
  });

  const rows = (await result.json()) as Array<{
    version: string;
    count: string;
    first_seen: string;
    last_seen: string;
  }>;

  return {
    versions: rows.map(r => ({
      version: r.version || null,
      count: Number(r.count),
      firstSeen: r.first_seen,
      lastSeen: r.last_seen,
    })),
  };
});
