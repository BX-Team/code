import { db, projects, quotas } from '@bx-team/stratus';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async event => {
  const session = await requireAuth(event);
  const userId = session.user.id;

  // Get or create quota record
  let [quota] = await db.select().from(quotas).where(eq(quotas.userId, userId));
  if (!quota) {
    [quota] = await db.insert(quotas).values({ userId }).onConflictDoNothing().returning();
    // If still null (race condition), re-fetch
    if (!quota) {
      [quota] = await db.select().from(quotas).where(eq(quotas.userId, userId));
    }
  }

  // Project ownership lives in Postgres, not ClickHouse, so resolve the user's project IDs
  // here and pass them into the ClickHouse query as a parameter.
  const ownedProjects = await db.select({ id: projects.id }).from(projects).where(eq(projects.ownerId, userId));
  const projectIds = ownedProjects.map(p => p.id);

  let eventsToday = 0;
  if (projectIds.length > 0) {
    const todayResult = await clickhouse.query({
      query: `
        SELECT count() AS total
        FROM events
        WHERE project_id IN ({projectIds: Array(String)})
          AND timestamp >= toStartOfDay(now())
      `,
      query_params: { projectIds },
      format: 'JSONEachRow',
    });

    const [todayRow] = (await todayResult.json()) as Array<{ total: string }>;
    eventsToday = Number(todayRow?.total ?? 0);
  }

  return {
    plan: 'free',
    limits: {
      maxProjects: quota?.maxProjects ?? 10,
      maxEventsPerDay: quota?.maxEventsPerDay ?? 100000,
    },
    usage: {
      projects: projectIds.length,
      eventsToday,
    },
  };
});
