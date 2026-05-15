import { db, projects, resolvedIssues } from '@bx-team/stratus';
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
  resolved: boolean;
  resolvedAt: string | null;
}

const SORT_COLUMNS: Record<string, string> = {
  last_seen: 'last_seen_at',
  first_seen: 'first_seen_at',
  events: 'count',
};

export default defineEventHandler(async event => {
  const session = await requireAuth(event);
  const id = requireParam(event, 'id');
  const query = getQuery(event);

  const status = (typeof query.status === 'string' ? query.status : 'unresolved') as
    | 'unresolved'
    | 'resolved'
    | 'all';
  const sortKey = (typeof query.sort === 'string' && SORT_COLUMNS[query.sort] ? query.sort : 'last_seen') as
    | 'last_seen'
    | 'first_seen'
    | 'events';
  const sortColumn = SORT_COLUMNS[sortKey];

  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.ownerId, session.user.id)));

  if (!project) throw createError({ statusCode: 404, message: 'Project not found' });

  const [rowsResult, totalResult, resolvedRows] = await Promise.all([
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
        ORDER BY ${sortColumn} DESC
        LIMIT 200
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
    db
      .select({ fingerprint: resolvedIssues.fingerprint, resolvedAt: resolvedIssues.resolvedAt })
      .from(resolvedIssues)
      .where(eq(resolvedIssues.projectId, id)),
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

  const resolvedMap = new Map(resolvedRows.map(r => [r.fingerprint, r.resolvedAt]));

  const all: ErrorRow[] = rows.map(r => {
    const resolvedAt = resolvedMap.get(r.id) ?? null;
    return {
      id: r.id,
      plugin: r.plugin,
      message: r.message,
      stacktrace: r.stacktrace,
      level: r.level,
      count: Number(r.count),
      firstSeenAt: r.first_seen_at,
      lastSeenAt: r.last_seen_at,
      resolved: resolvedAt !== null,
      resolvedAt: resolvedAt ? new Date(resolvedAt).toISOString() : null,
    };
  });

  const filtered =
    status === 'all' ? all : status === 'resolved' ? all.filter(r => r.resolved) : all.filter(r => !r.resolved);

  const counts = {
    unresolved: all.filter(r => !r.resolved).length,
    resolved: all.filter(r => r.resolved).length,
    all: all.length,
  };

  return {
    errors: filtered,
    total: Number(totalRow?.total ?? 0),
    counts,
    sort: sortKey,
    status,
  };
});
