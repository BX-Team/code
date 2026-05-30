import { alertRules, db, projects } from '@bx-team/stratus';
import { and, count, eq } from 'drizzle-orm';
import { z } from 'zod';

const bodySchema = z.object({
  type: z.enum(['new_issue', 'regression', 'error_spike']),
  webhookUrl: z.string().url().max(512),
  threshold: z.number().int().min(1).max(1_000_000).optional(),
  windowMinutes: z.number().int().min(1).max(1440).optional(),
  enabled: z.boolean().optional(),
});

const MAX_RULES_PER_PROJECT = 20;

export default defineEventHandler(async event => {
  const session = await requireAuth(event);
  const id = requireParam(event, 'id');

  const body = await readBody(event);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) throw createError({ statusCode: 400, message: parsed.error.message });

  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.ownerId, session.user.id)));
  if (!project) throw createError({ statusCode: 404, message: 'Project not found' });

  const [existing] = await db.select({ count: count() }).from(alertRules).where(eq(alertRules.projectId, id));
  if ((existing?.count ?? 0) >= MAX_RULES_PER_PROJECT) {
    throw createError({ statusCode: 403, message: `Alert rule limit reached (${MAX_RULES_PER_PROJECT}).` });
  }

  const [rule] = await db
    .insert(alertRules)
    .values({
      projectId: id,
      type: parsed.data.type,
      webhookUrl: parsed.data.webhookUrl,
      threshold: parsed.data.threshold ?? 10,
      windowMinutes: parsed.data.windowMinutes ?? 5,
      enabled: parsed.data.enabled ?? true,
    })
    .returning({
      id: alertRules.id,
      type: alertRules.type,
      enabled: alertRules.enabled,
      threshold: alertRules.threshold,
      windowMinutes: alertRules.windowMinutes,
      webhookUrl: alertRules.webhookUrl,
      lastFiredAt: alertRules.lastFiredAt,
      createdAt: alertRules.createdAt,
    });

  setResponseStatus(event, 201);
  return rule;
});
