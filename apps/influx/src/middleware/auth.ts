import { createPulsifyDb, dsnTokens } from '@bx-team/stratus/d1';
import { and, eq } from 'drizzle-orm';
import { createMiddleware } from 'hono/factory';
import type { Env } from '../env';

export type AuthVariables = {
  projectId: string;
  tokenId: string;
  token: string;
};

type AuthEnv = { Bindings: Env; Variables: AuthVariables };

/** Per-minute request cap (100/min/token) via the Workers Rate Limiting binding. */
const rateLimitMiddleware = createMiddleware<AuthEnv>(async (c, next) => {
  const token = c.req.header('authorization')?.replace(/^Bearer\s+/i, '');
  if (token) {
    const { success } = await c.env.RATE_LIMITER.limit({ key: token });
    if (!success) return c.json({ error: 'Rate limit exceeded' }, 429, { 'Retry-After': '60' });
  }
  await next();
});

/** Bearer token verified against pulsify-db dsnTokens, scoped to the URL's projectId. */
const bearerMiddleware = createMiddleware<AuthEnv>(async (c, next) => {
  const token = c.req.header('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401, { 'WWW-Authenticate': 'Bearer' });
  }

  const db = createPulsifyDb(c.env.PULSIFY_DB);
  const record = await db.query.dsnTokens.findFirst({
    where: and(eq(dsnTokens.key, token), eq(dsnTokens.revoked, false)),
    columns: { id: true, projectId: true },
  });

  if (!record || record.projectId !== c.req.param('projectId')) {
    return c.json({ error: 'Unauthorized' }, 401, { 'WWW-Authenticate': 'Bearer' });
  }

  c.executionCtx.waitUntil(db.update(dsnTokens).set({ lastUsedAt: new Date() }).where(eq(dsnTokens.id, record.id)));

  c.set('projectId', record.projectId);
  c.set('tokenId', record.id);
  c.set('token', token);
  await next();
});

export const authMiddleware = [rateLimitMiddleware, bearerMiddleware] as const;
