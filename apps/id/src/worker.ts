import { errorHandler, notFoundHandler } from '@bx-team/worker/error';
import type { ExportedHandler } from '@cloudflare/workers-types';
import { Hono, type MiddlewareHandler } from 'hono';
import { cors } from 'hono/cors';
import { activity } from './activity';
import { apps } from './apps';
import { BASE_PATH, createAuth, trustedOrigins } from './auth';
import type { Env } from './env';
import { notice } from './notice';
import { picture } from './picture';
import { PLAY_PATH, play } from './play/routes';

const app = new Hono<{ Bindings: Env }>();

// The site calls these with the session cookie, so only its origins, never `*`.
const trusted: MiddlewareHandler<{ Bindings: Env }> = (c, next) =>
  cors({
    origin: trustedOrigins(c.env),
    credentials: true,
    allowHeaders: ['Content-Type', 'Authorization', 'x-captcha-response'],
    exposeHeaders: ['set-auth-token'],
    allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  })(c, next);
app.use(`${BASE_PATH}/*`, trusted);
app.use(`${PLAY_PATH}/*`, trusted);

app.route(`${BASE_PATH}/apps`, apps);
app.route(`${BASE_PATH}/activity`, activity);
app.route(`${BASE_PATH}/picture`, picture);
app.route(`${BASE_PATH}/notice`, notice);
app.route(PLAY_PATH, play);

app.on(['GET', 'POST'], `${BASE_PATH}/*`, c => createAuth(c.env, c.executionCtx as never).handler(c.req.raw));

app.onError(errorHandler);
app.notFound(notFoundHandler);

export default { fetch: app.fetch } satisfies ExportedHandler<Env>;

export { UserHub } from './play/hub';
export { Lobby } from './play/lobby';
export { IdService } from './service';
