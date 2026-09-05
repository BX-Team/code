import type { ExportedHandler } from '@cloudflare/workers-types';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { trimTrailingSlash } from 'hono/trailing-slash';
import type { AppEnv } from './context';
import type { Env } from './env';
import { routes } from './routes';
import { errorHandler, notFoundHandler } from './util/error';

const app = new Hono<AppEnv>();

app.use(trimTrailingSlash());

// The read surface is public and credential-less, and meridian is a static site calling
// it cross-origin; a publish authenticates with a bearer token, never with a cookie.
app.use('*', cors({ allowHeaders: ['Content-Type', 'Authorization', 'Cache-Control'] }));

app.route('/', routes);

app.onError(errorHandler);
app.notFound(notFoundHandler);

export default { fetch: app.fetch } satisfies ExportedHandler<Env>;
