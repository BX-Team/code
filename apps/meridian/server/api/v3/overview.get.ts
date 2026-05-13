import { db, projects, serverMetadata } from '@bx-team/stratus';
import { eq, inArray } from 'drizzle-orm';

const RANGES = {
  '24h': { interval: '24 HOUR', bucket: 'toStartOfFiveMinutes' },
  '7d': { interval: '7 DAY', bucket: 'toStartOfHour' },
  '30d': { interval: '30 DAY', bucket: 'toStartOfHour' },
} as const;

type RangeKey = keyof typeof RANGES;

export default defineEventHandler(async event => {
  const session = await requireAuth(event);
  const query = getQuery(event);
  const rangeKey = (typeof query.range === 'string' && query.range in RANGES ? query.range : '7d') as RangeKey;
  const range = RANGES[rangeKey];

  const ownedProjects = await db
    .select({ id: projects.id, type: projects.type, name: projects.name, slug: projects.slug })
    .from(projects)
    .where(eq(projects.ownerId, session.user.id));

  const projectIds = ownedProjects.map(p => p.id);
  const serverIds = ownedProjects.filter(p => p.type === 'server').map(p => p.id);

  if (!projectIds.length) {
    return {
      summary: {
        projects: 0,
        servers: 0,
        plugins: 0,
        mods: 0,
        totalErrors: 0,
        totalEvents24h: 0,
        peakOnline24h: 0,
        uniquePlayers24h: 0,
      },
      timeseries: [],
      projects: [],
      range: rangeKey,
    };
  }

  const [errorCountRow] = await clickhouse
    .query({
      query: `SELECT count() AS total FROM error_events WHERE project_id IN ({projectIds: Array(String)})`,
      query_params: { projectIds },
      format: 'JSONEachRow',
    })
    .then(r => r.json<{ total: string }[]>())
    .catch(() => [] as { total: string }[]);

  const [eventsResult, peakResult, playersResult, timeseries] = await Promise.all([
    serverIds.length
      ? clickhouse
          .query({
            query: `SELECT count() AS total FROM events WHERE project_id IN ({projectIds: Array(String)}) AND timestamp >= now() - INTERVAL 24 HOUR`,
            query_params: { projectIds },
            format: 'JSONEachRow',
          })
          .then(r => r.json<{ total: string }[]>())
          .catch(() => [] as { total: string }[])
      : Promise.resolve([] as { total: string }[]),
    serverIds.length
      ? clickhouse
          .query({
            query: `SELECT max(online) AS peak FROM server_stats WHERE project_id IN ({projectIds: Array(String)}) AND timestamp >= now() - INTERVAL 24 HOUR`,
            query_params: { projectIds: serverIds },
            format: 'JSONEachRow',
          })
          .then(r => r.json<{ peak: number }[]>())
          .catch(() => [] as { peak: number }[])
      : Promise.resolve([] as { peak: number }[]),
    serverIds.length
      ? clickhouse
          .query({
            query: `SELECT countDistinct(player_uuid) AS players FROM player_sessions FINAL WHERE project_id IN ({projectIds: Array(String)}) AND joined_at >= now() - INTERVAL 24 HOUR`,
            query_params: { projectIds: serverIds },
            format: 'JSONEachRow',
          })
          .then(r => r.json<{ players: number }[]>())
          .catch(() => [] as { players: number }[])
      : Promise.resolve([] as { players: number }[]),
    serverIds.length
      ? clickhouse
          .query({
            query: `SELECT ${range.bucket}(timestamp) AS time, sum(online) AS online, avg(tps) AS tps FROM server_stats WHERE project_id IN ({projectIds: Array(String)}) AND timestamp >= now() - INTERVAL ${range.interval} GROUP BY time ORDER BY time`,
            query_params: { projectIds: serverIds },
            format: 'JSONEachRow',
          })
          .then(r => r.json())
          .catch(() => [])
      : Promise.resolve([]),
  ]);

  const lastSeen = await db
    .select({
      projectId: serverMetadata.projectId,
      lastSeenAt: serverMetadata.lastSeenAt,
      software: serverMetadata.software,
      mcVersion: serverMetadata.mcVersion,
      countryCode: serverMetadata.countryCode,
    })
    .from(serverMetadata)
    .where(inArray(serverMetadata.projectId, projectIds));

  const errorsByProjectRows = await clickhouse
    .query({
      query: `SELECT project_id, count() AS total FROM error_events WHERE project_id IN ({projectIds: Array(String)}) GROUP BY project_id`,
      query_params: { projectIds },
      format: 'JSONEachRow',
    })
    .then(r => r.json<{ project_id: string; total: string }[]>())
    .catch(() => [] as { project_id: string; total: string }[]);

  const metaByProject = new Map(lastSeen.map(m => [m.projectId, m]));
  const errorsByProjectMap = new Map(errorsByProjectRows.map(e => [e.project_id, Number(e.total)]));

  const enrichedProjects = ownedProjects.map(p => ({
    ...p,
    lastSeenAt: metaByProject.get(p.id)?.lastSeenAt ?? null,
    software: metaByProject.get(p.id)?.software ?? null,
    mcVersion: metaByProject.get(p.id)?.mcVersion ?? null,
    errors: errorsByProjectMap.get(p.id) ?? 0,
  }));

  return {
    summary: {
      projects: ownedProjects.length,
      servers: ownedProjects.filter(p => p.type === 'server').length,
      plugins: ownedProjects.filter(p => p.type === 'plugin').length,
      mods: ownedProjects.filter(p => p.type === 'mod').length,
      totalErrors: Number(errorCountRow?.total ?? 0),
      totalEvents24h: Number(eventsResult[0]?.total ?? 0),
      peakOnline24h: Number(peakResult[0]?.peak ?? 0),
      uniquePlayers24h: Number(playersResult[0]?.players ?? 0),
    },
    timeseries,
    projects: enrichedProjects,
    range: rangeKey,
  };
});
