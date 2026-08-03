import { createMiddleware } from 'hono/factory';
import type { Env } from '../env';
import { unauthorized } from './error';

/** Guards the CI-facing publish endpoints with the shared bearer secret. */
export const requireApiSecret = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  if (c.req.header('Authorization') !== `Bearer ${c.env.API_SECRET_KEY}`) throw unauthorized();
  await next();
});
