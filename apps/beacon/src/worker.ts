import { errorHandler, notFoundHandler } from '@bx-team/worker/error';
import type { ExportedHandler } from '@cloudflare/workers-types';
import { Hono } from 'hono';
import type { BeaconEnv } from './context';
import type { Env } from './env';
import { routes } from './routes';

const app = new Hono<BeaconEnv>();

app.route('/', routes);

app.onError(errorHandler);
app.notFound(notFoundHandler);

export default { fetch: app.fetch } satisfies ExportedHandler<Env>;
