import { alertRules, db, projects } from '@bx-team/stratus';
import { and, desc, eq } from 'drizzle-orm';

export default defineEventHandler(async event => {
  const session = await requireAuth(event);
  const id = requireParam(event, 'id');

  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.ownerId, session.user.id)));
  if (!project) throw createError({ statusCode: 404, message: 'Project not found' });

  const rules = await db
    .select({
      id: alertRules.id,
      type: alertRules.type,
      enabled: alertRules.enabled,
      threshold: alertRules.threshold,
      windowMinutes: alertRules.windowMinutes,
      webhookUrl: alertRules.webhookUrl,
      lastFiredAt: alertRules.lastFiredAt,
      createdAt: alertRules.createdAt,
    })
    .from(alertRules)
    .where(eq(alertRules.projectId, id))
    .orderBy(desc(alertRules.createdAt));

  return { rules };
});
