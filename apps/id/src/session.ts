import { unauthorized } from '@bx-team/worker/error';
import type { MiddlewareHandler } from 'hono';
import { createAuth } from './auth';
import type { Env } from './env';

export type Vars = { userId: string };

/** The BX ID session: a bearer token from the launcher, the cookie from the site. */
export const signedIn: MiddlewareHandler<{ Bindings: Env; Variables: Vars }> = async (c, next) => {
  const session = await createAuth(c.env, c.executionCtx as never).api.getSession({ headers: c.req.raw.headers });
  if (!session) throw unauthorized();
  c.set('userId', session.user.id);
  await next();
};
