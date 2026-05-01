import { Hono } from 'hono';
import { ingestQueue } from '../lib/queue';
import { type AuthVariables, authMiddleware } from '../middleware/auth';

export const ingestRoute = new Hono<{ Variables: AuthVariables }>();

ingestRoute.use('/e/:projectId', ...authMiddleware);

ingestRoute.post('/e/:projectId', async c => {
  const projectId = c.get('projectId');
  const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
  const receivedAt = new Date().toISOString();

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400);
  }

  const events = Array.isArray(body) ? body : [body];
  if (events.length === 0) return c.json({ error: 'Empty batch' }, 400);

  await ingestQueue.addBulk(
    events.map(event => ({
      name: 'ingest',
      data: { event, projectId, receivedAt, ip },
    })),
  );

  return c.json({ accepted: events.length }, 202);
});
