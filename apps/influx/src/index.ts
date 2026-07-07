import { Hono } from 'hono';
import type { Env } from './env';
import { ingestRoute } from './routes/ingest';

const app = new Hono<{ Bindings: Env }>();

app.get('/health', c => c.json({ status: 'ok', service: 'influx' }));

app.route('/api/v1', ingestRoute);

export default {
  fetch: app.fetch,
} satisfies ExportedHandler<Env>;
