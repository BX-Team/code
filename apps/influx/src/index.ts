import { Hono } from 'hono';
import { env } from './env';
import { healthRoute } from './routes/health';
import { ingestRoute } from './routes/ingest';

const app = new Hono();

app.route('/', healthRoute);
app.route('/api/v1', ingestRoute);

export default {
  port: env.PORT,
  fetch: app.fetch,
};
