import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { trimTrailingSlash } from 'hono/trailing-slash';
import type { Env } from './env';
import { routes } from './routes';
import { errorHandler, notFoundHandler } from './util/error';

const app = new Hono<{ Bindings: Env }>();

app.use(trimTrailingSlash());

// The whole surface is a public, credential-less read API consumed cross-origin by the
// static meridian frontend; writes authenticate with a bearer secret, not a cookie.
app.use('*', cors({ allowHeaders: ['Content-Type', 'Authorization'] }));

app.route('/', routes);

app.onError(errorHandler);
app.notFound(notFoundHandler);

export default {
  fetch: app.fetch,
} satisfies ExportedHandler<Env>;
