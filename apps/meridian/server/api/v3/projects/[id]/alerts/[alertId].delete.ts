import { alertRules, db, projects } from '@bx-team/stratus';
import { and, eq } from 'drizzle-orm';

export default defineEventHandler(async event => {
  const session = await requireAuth(event);
  const id = requireParam(event, 'id');
  const alertId = requireParam(event, 'alertId');

  const [rule] = await db
    .select({ id: alertRules.id })
    .from(alertRules)
    .innerJoin(projects, eq(alertRules.projectId, projects.id))
    .where(and(eq(alertRules.id, alertId), eq(alertRules.projectId, id), eq(projects.ownerId, session.user.id)));
  if (!rule) throw createError({ statusCode: 404, message: 'Alert rule not found' });

  await db.delete(alertRules).where(eq(alertRules.id, alertId));
  return { ok: true };
});
