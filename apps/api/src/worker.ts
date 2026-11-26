import { errorHandler, notFoundHandler } from '@bx-team/worker/error';
import { cors } from 'hono/cors';
import { trimTrailingSlash } from 'hono/trailing-slash';
import { router } from './router';
import { routes } from './routes';

const app = router();

app.use(trimTrailingSlash());

// Reads are public and credential-less; a publish uses a bearer token, never a cookie.
app.use('*', cors({ allowHeaders: ['Content-Type', 'Authorization', 'Cache-Control'] }));

app.route('/', routes);

app.onError(errorHandler);
app.notFound(notFoundHandler);

export default { fetch: app.fetch } satisfies ExportedHandler<Env>;
