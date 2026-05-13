import { db, projects } from '@bx-team/stratus';
import { and, eq } from 'drizzle-orm';

interface ErrorRow {
  id: string;
  plugin: string;
  message: string;
  stacktrace: string;
  level: string;
  count: number;
  firstSeenAt: string;
  lastSeenAt: string;
}

export default defineEventHandler(async event => {
  const session = await requireAuth(event);
  const id = requireParam(event, 'id');

  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.ownerId, session.user.id)));

  if (!project) throw createError({ statusCode: 404, message: 'Project not found' });

  const [rowsResult, totalResult] = await Promise.all([
    clickhouse.query({
      query: `
        SELECT
          lower(hex(MD5(concat(plugin, message, level, stacktrace)))) AS id,
          plugin,
          message,
          stacktrace,
          level,
          count()                       AS count,
          min(timestamp)                AS first_seen_at,
          max(timestamp)                AS last_seen_at
        FROM error_events
        WHERE project_id = {projectId: String}
        GROUP BY plugin, message, level, stacktrace
        ORDER BY last_seen_at DESC
        LIMIT 50
      `,
      query_params: { projectId: id },
      format: 'JSONEachRow',
    }),
    clickhouse.query({
      query: `
        SELECT countDistinct(concat(plugin, message, level, stacktrace)) AS total
        FROM error_events
        WHERE project_id = {projectId: String}
      `,
      query_params: { projectId: id },
      format: 'JSONEachRow',
    }),
  ]);

  const rows = (await rowsResult.json()) as Array<{
    id: string;
    plugin: string;
    message: string;
    stacktrace: string;
    level: string;
    count: string;
    first_seen_at: string;
    last_seen_at: string;
  }>;

  const [totalRow] = (await totalResult.json()) as Array<{ total: string }>;

  const errors: ErrorRow[] = rows.map(r => ({
    id: r.id,
    plugin: r.plugin,
    message: r.message,
    stacktrace: r.stacktrace,
    level: r.level,
    count: Number(r.count),
    firstSeenAt: r.first_seen_at,
    lastSeenAt: r.last_seen_at,
  }));

  return { errors, total: Number(totalRow?.total ?? 0) };
});
