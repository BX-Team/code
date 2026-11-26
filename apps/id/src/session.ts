import { unauthorized } from '@bx-team/worker/error';
import type { MiddlewareHandler } from 'hono';
import { createAuth } from './auth';

export type Bindings = { Bindings: Env; Variables: { userId: string; sessionId: string } };

/** The BX ID session: a bearer token from the launcher, the cookie from the site. */
export const signedIn: MiddlewareHandler<Bindings> = async (c, next) => {
  const session = await createAuth(c.env, c.executionCtx as never).api.getSession({ headers: c.req.raw.headers });
  if (!session) throw unauthorized();
  c.set('userId', session.user.id);
  c.set('sessionId', session.session.id);
  await next();
};
