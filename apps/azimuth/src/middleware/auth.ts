import { createMiddleware } from 'hono/factory';
import type { Env } from '../env';
import { type AuthSession, buildAuth } from '../lib/auth';

export type SessionVariables = {
  authSession: AuthSession;
};

type SessionEnv = { Bindings: Env; Variables: SessionVariables };

/** Resolves the Better Auth session (nullable) into `c.var.authSession` without failing. */
export const sessionMiddleware = createMiddleware<SessionEnv>(async (c, next) => {
  const session = await buildAuth(c.env).api.getSession({ headers: c.req.raw.headers });
  c.set('authSession', session);
  await next();
});

/**
 * Enforces an authenticated session (401 otherwise). Self-contained — resolves the session
 * itself, so it can be used with or without sessionMiddleware.
 */
export const requireAuth = createMiddleware<SessionEnv>(async (c, next) => {
  const session = await buildAuth(c.env).api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: 'Unauthorized' }, 401);
  c.set('authSession', session);
  await next();
});
