import { createPulsifyDb, dsnTokens } from '@bx-team/stratus/d1';
import { and, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import type { Env } from '../../env';
import { ownedProject } from '../../lib/pulsify';
import type { SessionVariables } from '../../middleware/auth';

type PulsifyEnv = { Bindings: Env; Variables: SessionVariables };

const createBodySchema = z.object({
  label: z.string().min(1).max(64).optional(),
});

function generateTokenKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
}

export const tokenRoutes = new Hono<PulsifyEnv>();

tokenRoutes.get('/projects/:id/tokens', async c => {
  const session = c.get('authSession');
  if (!session) return c.json({ message: 'Unauthorized' }, 401);
  const db = createPulsifyDb(c.env.PULSIFY_DB);
  const id = c.req.param('id');

  const project = await ownedProject(db, id, session.user.id);
  if (!project) return c.json({ message: 'Project not found' }, 404);

  const tokens = await db
    .select({
      id: dsnTokens.id,
      label: dsnTokens.label,
      revoked: dsnTokens.revoked,
      lastUsedAt: dsnTokens.lastUsedAt,
      createdAt: dsnTokens.createdAt,
    })
    .from(dsnTokens)
    .where(eq(dsnTokens.projectId, id));

  return c.json(tokens);
});

tokenRoutes.post('/projects/:id/tokens', async c => {
  const session = c.get('authSession');
  if (!session) return c.json({ message: 'Unauthorized' }, 401);
  const db = createPulsifyDb(c.env.PULSIFY_DB);
  const id = c.req.param('id');

  const project = await ownedProject(db, id, session.user.id);
  if (!project) return c.json({ message: 'Project not found' }, 404);

  const parsed = createBodySchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ message: parsed.error.message }, 400);

  const [token] = await db
    .insert(dsnTokens)
    .values({ projectId: id, key: generateTokenKey(), label: parsed.data.label ?? null })
    .returning({
      id: dsnTokens.id,
      key: dsnTokens.key,
      label: dsnTokens.label,
      createdAt: dsnTokens.createdAt,
    });

  return c.json(token, 201);
});

tokenRoutes.delete('/projects/:id/tokens/:tokenId', async c => {
  const session = c.get('authSession');
  if (!session) return c.json({ message: 'Unauthorized' }, 401);
  const db = createPulsifyDb(c.env.PULSIFY_DB);
  const id = c.req.param('id');
  const tokenId = c.req.param('tokenId');

  const project = await ownedProject(db, id, session.user.id);
  if (!project) return c.json({ message: 'Project not found' }, 404);

  const [token] = await db
    .update(dsnTokens)
    .set({ revoked: true })
    .where(and(eq(dsnTokens.id, tokenId), eq(dsnTokens.projectId, id)))
    .returning({ id: dsnTokens.id });

  if (!token) return c.json({ message: 'Token not found' }, 404);
  return c.body(null, 204);
});
