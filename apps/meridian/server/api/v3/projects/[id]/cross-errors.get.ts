import { db, pluginInstallations, projects } from '@bx-team/stratus';
import { and, eq } from 'drizzle-orm';

export default defineEventHandler(async event => {
  const session = await requireAuth(event);
  const id = requireParam(event, 'id');

  // Verify project ownership and type
  const [project] = await db
    .select({ id: projects.id, name: projects.name, type: projects.type, verified: projects.verified })
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.ownerId, session.user.id)));

  if (!project) throw createError({ statusCode: 404, message: 'Project not found' });
  if (project.type === 'server')
    throw createError({ statusCode: 400, message: 'Only available for plugin/mod projects' });

  // Cross-server aggregation surfaces crashes from servers the author does not own, so it
  // is gated behind name-ownership verification — otherwise anyone could register a project
  // named "EssentialsX" and harvest everyone else's crashes.
  if (!project.verified) {
    return { errors: [], total: 0, totalServers: 0, sharingServers: 0, verified: false };
  }

  // Get all server IDs that have this plugin installed (with error sharing enabled)
  const installations = await db
    .select({ serverId: pluginInstallations.serverId, shareErrors: pluginInstallations.shareErrors })
    .from(pluginInstallations)
    .where(eq(pluginInstallations.pluginId, id));

  const totalServers = installations.length;
  const sharingServers = installations.filter(i => i.shareErrors);
  const serverIds = sharingServers.map(i => i.serverId);

  if (serverIds.length === 0) {
    return {
      errors: [],
      total: 0,
      totalServers,
      sharingServers: 0,
      verified: true,
    };
  }

  // Query ClickHouse for errors from those servers where plugin name matches.
  // Fingerprint on the normalized message/stacktrace so dynamic data doesn't split
  // one logical crash across servers into thousands of groups.
  const rowsResult = await clickhouse.query({
    query: `
      SELECT
        lower(hex(MD5(concat(${normalizeExpr('message')}, level, ${normalizeExpr('stacktrace')})))) AS id,
        argMax(message, timestamp)        AS msg,
        argMax(stacktrace, timestamp)     AS stack,
        level,
        count()                           AS count,
        uniqExact(project_id)             AS server_count,
        min(timestamp)                    AS first_seen_at,
        max(timestamp)                    AS last_seen_at,
        argMax(server_software, timestamp) AS server_software,
        argMax(server_version, timestamp)  AS server_version,
        argMax(plugin_version, timestamp)  AS plugin_version
      FROM error_events
      WHERE project_id IN ({serverIds: Array(String)})
        AND plugin = {pluginName: String}
      GROUP BY ${normalizeExpr('message')}, level, ${normalizeExpr('stacktrace')}
      ORDER BY count DESC
      LIMIT 100
    `,
    query_params: { serverIds, pluginName: project.name },
    format: 'JSONEachRow',
  });

  const rows = (await rowsResult.json()) as Array<{
    id: string;
    msg: string;
    stack: string;
    level: string;
    count: string;
    server_count: string;
    first_seen_at: string;
    last_seen_at: string;
    server_software: string;
    server_version: string;
    plugin_version: string;
  }>;

  return {
    errors: rows.map(r => ({
      id: r.id,
      message: anonymize(r.msg),
      stacktrace: anonymize(r.stack),
      level: r.level,
      count: Number(r.count),
      serverCount: Number(r.server_count),
      firstSeenAt: r.first_seen_at,
      lastSeenAt: r.last_seen_at,
      serverSoftware: r.server_software || null,
      serverVersion: r.server_version || null,
      pluginVersion: r.plugin_version || null,
    })),
    total: rows.length,
    totalServers,
    sharingServers: sharingServers.length,
    verified: true,
  };
});
