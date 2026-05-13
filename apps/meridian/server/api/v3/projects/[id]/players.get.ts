import { db, projects } from '@bx-team/stratus';
import { and, eq } from 'drizzle-orm';

export default defineEventHandler(async event => {
  const session = await requireAuth(event);
  const id = requireParam(event, 'id');

  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.ownerId, session.user.id)));

  if (!project) throw createError({ statusCode: 404, message: 'Project not found' });

  const [sessions, uniqueResult, newPlayersResult] = await Promise.all([
    clickhouse
      .query({
        query: `
          SELECT player_uuid, joined_at, client_version, country_code
          FROM player_sessions FINAL
          WHERE project_id = {projectId: String}
            AND joined_at >= now() - INTERVAL 24 HOUR
          ORDER BY joined_at DESC
          LIMIT 100
        `,
        query_params: { projectId: id },
        format: 'JSONEachRow',
      })
      .then(r => r.json()),

    clickhouse
      .query({
        query: `
        SELECT countDistinct(player_uuid) AS unique_players
        FROM player_sessions FINAL
        WHERE project_id = {projectId: String}
          AND joined_at >= now() - INTERVAL 24 HOUR
      `,
        query_params: { projectId: id },
        format: 'JSONEachRow',
      })
      .then(r => r.json<{ unique_players: number }[]>()),

    clickhouse
      .query({
        query: `
        SELECT countDistinct(player_uuid) AS new_players
        FROM player_sessions FINAL
        WHERE project_id = {projectId: String}
          AND joined_at >= now() - INTERVAL 24 HOUR
          AND player_uuid NOT IN (
            SELECT DISTINCT player_uuid FROM player_sessions FINAL
            WHERE project_id = {projectId: String}
              AND joined_at < now() - INTERVAL 24 HOUR
          )
      `,
        query_params: { projectId: id },
        format: 'JSONEachRow',
      })
      .then(r => r.json<{ new_players: number }[]>()),
  ]);

  return {
    sessions,
    summary: {
      uniquePlayers: uniqueResult[0]?.unique_players ?? 0,
      newPlayers: newPlayersResult[0]?.new_players ?? 0,
    },
  };
});
