import { alertRules, db, projects } from '@bx-team/stratus';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

const bodySchema = z.object({
  enabled: z.boolean().optional(),
  threshold: z.number().int().min(1).max(1_000_000).optional(),
  windowMinutes: z.number().int().min(1).max(1440).optional(),
  webhookUrl: z.string().url().max(512).optional(),
});

export default defineEventHandler(async event => {
  const session = await requireAuth(event);
  const id = requireParam(event, 'id');
  const alertId = requireParam(event, 'alertId');

  const body = await readBody(event);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) throw createError({ statusCode: 400, message: parsed.error.message });
  if (Object.keys(parsed.data).length === 0) throw createError({ statusCode: 400, message: 'No fields to update' });

  const [rule] = await db
    .select({ id: alertRules.id })
    .from(alertRules)
    .innerJoin(projects, eq(alertRules.projectId, projects.id))
    .where(and(eq(alertRules.id, alertId), eq(alertRules.projectId, id), eq(projects.ownerId, session.user.id)));
  if (!rule) throw createError({ statusCode: 404, message: 'Alert rule not found' });

  const [updated] = await db.update(alertRules).set(parsed.data).where(eq(alertRules.id, alertId)).returning({
    id: alertRules.id,
    type: alertRules.type,
    enabled: alertRules.enabled,
    threshold: alertRules.threshold,
    windowMinutes: alertRules.windowMinutes,
    webhookUrl: alertRules.webhookUrl,
    lastFiredAt: alertRules.lastFiredAt,
    createdAt: alertRules.createdAt,
  });

  return updated;
});
