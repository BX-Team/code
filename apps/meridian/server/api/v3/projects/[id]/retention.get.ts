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

  const [d1Rows, d7Rows] = await Promise.all([
    clickhouse
      .query({
        query: `
					SELECT
						count()                                        AS cohort_size,
						countIf(day1.player_uuid IS NOT NULL)          AS retained
					FROM (
						SELECT DISTINCT player_uuid
						FROM player_sessions
						WHERE project_id = {projectId: String}
							AND toDate(joined_at) = today() - 2
					) cohort
					LEFT JOIN (
						SELECT DISTINCT player_uuid
						FROM player_sessions
						WHERE project_id = {projectId: String}
							AND toDate(joined_at) = today() - 1
					) day1 ON cohort.player_uuid = day1.player_uuid
				`,
        query_params: { projectId: id },
        format: 'JSONEachRow',
      })
      .then(r => r.json<{ cohort_size: string; retained: string }>()),

    clickhouse
      .query({
        query: `
					SELECT
						count()                                        AS cohort_size,
						countIf(day7.player_uuid IS NOT NULL)          AS retained
					FROM (
						SELECT DISTINCT player_uuid
						FROM player_sessions
						WHERE project_id = {projectId: String}
							AND toDate(joined_at) = today() - 8
					) cohort
					LEFT JOIN (
						SELECT DISTINCT player_uuid
						FROM player_sessions
						WHERE project_id = {projectId: String}
							AND toDate(joined_at) = today() - 7
					) day7 ON cohort.player_uuid = day7.player_uuid
				`,
        query_params: { projectId: id },
        format: 'JSONEachRow',
      })
      .then(r => r.json<{ cohort_size: string; retained: string }>()),
  ]);

  const d1Cohort = Number(d1Rows[0]?.cohort_size ?? 0);
  const d1Retained = Number(d1Rows[0]?.retained ?? 0);
  const d7Cohort = Number(d7Rows[0]?.cohort_size ?? 0);
  const d7Retained = Number(d7Rows[0]?.retained ?? 0);

  return {
    d1: {
      cohort: d1Cohort,
      retained: d1Retained,
      pct: d1Cohort > 0 ? Math.round((d1Retained / d1Cohort) * 1000) / 10 : 0,
    },
    d7: {
      cohort: d7Cohort,
      retained: d7Retained,
      pct: d7Cohort > 0 ? Math.round((d7Retained / d7Cohort) * 1000) / 10 : 0,
    },
  };
});
