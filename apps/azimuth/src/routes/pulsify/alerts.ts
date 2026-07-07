import { alertRules, createPulsifyDb, projects } from '@bx-team/stratus/d1';
import { and, count, desc, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import type { Env } from '../../env';
import { ownedProject } from '../../lib/pulsify';
import type { SessionVariables } from '../../middleware/auth';

type PulsifyEnv = { Bindings: Env; Variables: SessionVariables };

const createBodySchema = z.object({
  type: z.enum(['new_issue', 'regression', 'error_spike']),
  webhookUrl: z.string().url().max(512),
  threshold: z.number().int().min(1).max(1_000_000).optional(),
  windowMinutes: z.number().int().min(1).max(1440).optional(),
  enabled: z.boolean().optional(),
});

const patchBodySchema = z.object({
  enabled: z.boolean().optional(),
  threshold: z.number().int().min(1).max(1_000_000).optional(),
  windowMinutes: z.number().int().min(1).max(1440).optional(),
  webhookUrl: z.string().url().max(512).optional(),
});

const MAX_RULES_PER_PROJECT = 20;

const ruleColumns = {
  id: alertRules.id,
  type: alertRules.type,
  enabled: alertRules.enabled,
  threshold: alertRules.threshold,
  windowMinutes: alertRules.windowMinutes,
  webhookUrl: alertRules.webhookUrl,
  lastFiredAt: alertRules.lastFiredAt,
  createdAt: alertRules.createdAt,
};

export const alertRoutes = new Hono<PulsifyEnv>();

alertRoutes.get('/projects/:id/alerts', async c => {
  const session = c.get('authSession');
  if (!session) return c.json({ message: 'Unauthorized' }, 401);
  const db = createPulsifyDb(c.env.PULSIFY_DB);
  const id = c.req.param('id');

  const project = await ownedProject(db, id, session.user.id);
  if (!project) return c.json({ message: 'Project not found' }, 404);

  const rules = await db
    .select(ruleColumns)
    .from(alertRules)
    .where(eq(alertRules.projectId, id))
    .orderBy(desc(alertRules.createdAt));

  return c.json({ rules });
});

alertRoutes.post('/projects/:id/alerts', async c => {
  const session = c.get('authSession');
  if (!session) return c.json({ message: 'Unauthorized' }, 401);
  const db = createPulsifyDb(c.env.PULSIFY_DB);
  const id = c.req.param('id');

  const parsed = createBodySchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ message: parsed.error.message }, 400);

  const project = await ownedProject(db, id, session.user.id);
  if (!project) return c.json({ message: 'Project not found' }, 404);

  const [existing] = await db.select({ count: count() }).from(alertRules).where(eq(alertRules.projectId, id));
  if ((existing?.count ?? 0) >= MAX_RULES_PER_PROJECT) {
    return c.json({ message: `Alert rule limit reached (${MAX_RULES_PER_PROJECT}).` }, 403);
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
    .returning(ruleColumns);

  return c.json(rule, 201);
});

alertRoutes.patch('/projects/:id/alerts/:alertId', async c => {
  const session = c.get('authSession');
  if (!session) return c.json({ message: 'Unauthorized' }, 401);
  const db = createPulsifyDb(c.env.PULSIFY_DB);
  const id = c.req.param('id');
  const alertId = c.req.param('alertId');

  const parsed = patchBodySchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ message: parsed.error.message }, 400);
  if (Object.keys(parsed.data).length === 0) return c.json({ message: 'No fields to update' }, 400);

  const [rule] = await db
    .select({ id: alertRules.id })
    .from(alertRules)
    .innerJoin(projects, eq(alertRules.projectId, projects.id))
    .where(and(eq(alertRules.id, alertId), eq(alertRules.projectId, id), eq(projects.ownerId, session.user.id)));
  if (!rule) return c.json({ message: 'Alert rule not found' }, 404);

  const [updated] = await db
    .update(alertRules)
    .set(parsed.data)
    .where(eq(alertRules.id, alertId))
    .returning(ruleColumns);

  return c.json(updated);
});

alertRoutes.delete('/projects/:id/alerts/:alertId', async c => {
  const session = c.get('authSession');
  if (!session) return c.json({ message: 'Unauthorized' }, 401);
  const db = createPulsifyDb(c.env.PULSIFY_DB);
  const id = c.req.param('id');
  const alertId = c.req.param('alertId');

  const [rule] = await db
    .select({ id: alertRules.id })
    .from(alertRules)
    .innerJoin(projects, eq(alertRules.projectId, projects.id))
    .where(and(eq(alertRules.id, alertId), eq(alertRules.projectId, id), eq(projects.ownerId, session.user.id)));
  if (!rule) return c.json({ message: 'Alert rule not found' }, 404);

  await db.delete(alertRules).where(eq(alertRules.id, alertId));
  return c.json({ ok: true });
});
