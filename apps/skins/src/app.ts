import { bxid } from '@bx-team/worker/bxid';
import { database } from '@bx-team/worker/db';
import { unauthorized } from '@bx-team/worker/error';
import { list } from '@bx-team/worker/http';
import { type Context, Hono, type MiddlewareHandler } from 'hono';
import { cors } from 'hono/cors';
import type { Tables } from './tables';

export type Bindings = { Bindings: Env; Variables: { userId: string } };

export const app = new Hono<Bindings>();

// Before any route, as Hono runs middleware only for later ones: textures are public, the rest is for the site's origins.
app.use('/v1/skins/textures/*', cors({ origin: '*' }));
for (const path of ['/v1/skins/me', '/v1/skins/profiles', '/v1/skins/profiles/*']) {
  app.use(path, (c, next) =>
    cors({
      origin: list(c.env.TRUSTED_ORIGINS),
      credentials: true,
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    })(c, next),
  );
}

export const db = (env: Env) => database<Tables>(env.DB);

/** The BX ID behind the request's session cookie or bearer token, asked of BX ID itself. */
export const signedIn: MiddlewareHandler<Bindings> = async (c, next) => {
  const userId = await bxid(c.env).userId({
    cookie: c.req.header('cookie'),
    authorization: c.req.header('authorization'),
  });
  if (!userId) throw unauthorized();
  c.set('userId', userId);
  await next();
};

export type Ctx = Context<Bindings>;
