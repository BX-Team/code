import type { ExportedHandler, MessageBatch } from '@cloudflare/workers-types';
import { Hono } from 'hono';
import type { BeaconEnv } from './context';
import type { Env } from './env';
import { consume } from './queue/consumer';
import { routes } from './routes';
import { errorHandler, notFoundHandler } from './util/error';

const app = new Hono<BeaconEnv>();

app.route('/', routes);

app.onError(errorHandler);
app.notFound(notFoundHandler);

export default {
  fetch: app.fetch,
  queue: (batch: MessageBatch<unknown>, env: Env) => consume(batch, env),
} satisfies ExportedHandler<Env>;
