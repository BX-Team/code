import { db, issues, projects } from '@bx-team/stratus';
import { and, eq } from 'drizzle-orm';

type IssueStatus = 'open' | 'resolved' | 'ignored' | 'muted';

interface ErrorRow {
  id: string;
  plugin: string;
  message: string;
  stacktrace: string;
  level: string;
  count: number;
  firstSeenAt: string;
  lastSeenAt: string;
  status: IssueStatus;
  mutedUntil: string | null;
  resolvedAt: string | null;
  firstVersion: string | null;
  lastVersion: string | null;
  serverVersion: string | null;
  serverSoftware: string | null;
  pluginVersion: string | null;
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
    | 'ignored'
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

  const [rowsResult, totalResult, issueRows] = await Promise.all([
    clickhouse.query({
      query: `
        SELECT
          fingerprint                        AS id,
          any(plugin)                        AS plugin,
          argMax(message, timestamp)         AS msg,
          argMax(stacktrace, timestamp)      AS stack,
          any(level)                         AS level,
          count()                            AS count,
          min(timestamp)                     AS first_seen_at,
          max(timestamp)                     AS last_seen_at,
          argMax(server_version, timestamp)  AS server_version,
          argMax(server_software, timestamp) AS server_software,
          argMax(plugin_version, timestamp)  AS plugin_version
        FROM error_events
        WHERE project_id = {projectId: String} AND fingerprint != ''
        GROUP BY fingerprint
        ORDER BY ${sortColumn} DESC
        LIMIT 200
      `,
      query_params: { projectId: id },
      format: 'JSONEachRow',
    }),
    clickhouse.query({
      query: `
        SELECT uniqExact(fingerprint) AS total
        FROM error_events
        WHERE project_id = {projectId: String} AND fingerprint != ''
      `,
      query_params: { projectId: id },
      format: 'JSONEachRow',
    }),
    db
      .select({
        fingerprint: issues.fingerprint,
        status: issues.status,
        mutedUntil: issues.mutedUntil,
        resolvedAt: issues.resolvedAt,
        firstVersion: issues.firstVersion,
        lastVersion: issues.lastVersion,
      })
      .from(issues)
      .where(eq(issues.projectId, id)),
  ]);

  const rows = (await rowsResult.json()) as Array<{
    id: string;
    plugin: string;
    msg: string;
    stack: string;
    level: string;
    count: string;
    first_seen_at: string;
    last_seen_at: string;
    server_version: string;
    server_software: string;
    plugin_version: string;
  }>;

  const [totalRow] = (await totalResult.json()) as Array<{ total: string }>;

  const issueMap = new Map(issueRows.map(r => [r.fingerprint, r]));
  const now = Date.now();

  // A mute auto-expires: a 'muted' issue past its window behaves as open again until the next
  // event flips it back in the registry, so listing reflects that immediately.
  const effectiveStatus = (rec: (typeof issueRows)[number] | undefined): IssueStatus => {
    if (!rec) return 'open';
    if (rec.status === 'muted' && rec.mutedUntil && rec.mutedUntil.getTime() < now) return 'open';
    return rec.status;
  };

  const all: ErrorRow[] = rows.map(r => {
    const rec = issueMap.get(r.id);
    const eff = effectiveStatus(rec);
    return {
      id: r.id,
      plugin: r.plugin,
      message: r.msg,
      stacktrace: r.stack,
      level: r.level,
      count: Number(r.count),
      firstSeenAt: r.first_seen_at,
      lastSeenAt: r.last_seen_at,
      status: eff,
      mutedUntil: rec?.mutedUntil ? new Date(rec.mutedUntil).toISOString() : null,
      resolvedAt: rec?.resolvedAt ? new Date(rec.resolvedAt).toISOString() : null,
      firstVersion: rec?.firstVersion ?? null,
      lastVersion: rec?.lastVersion ?? null,
      serverVersion: r.server_version || null,
      serverSoftware: r.server_software || null,
      pluginVersion: r.plugin_version || null,
    };
  });

  const counts = {
    unresolved: all.filter(r => r.status === 'open').length,
    resolved: all.filter(r => r.status === 'resolved').length,
    ignored: all.filter(r => r.status === 'ignored').length,
    all: all.length,
  };

  const filtered = all.filter(r => {
    if (status === 'all') return true;
    if (status === 'unresolved') return r.status === 'open';
    if (status === 'resolved') return r.status === 'resolved';
    if (status === 'ignored') return r.status === 'ignored';
    return true;
  });

  return {
    errors: filtered,
    total: Number(totalRow?.total ?? 0),
    counts,
    sort: sortKey,
    status,
  };
});
