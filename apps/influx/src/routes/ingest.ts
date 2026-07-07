import { createPulsifyDb, dailyUsage } from '@bx-team/stratus/d1';
import { sql } from 'drizzle-orm';
import { Hono } from 'hono';
import type { Env } from '../env';
import { enqueueEvents } from '../lib/queue';
import { type AuthVariables, authMiddleware } from '../middleware/auth';

const DAILY_QUOTA = 100_000;

export const ingestRoute = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

ingestRoute.use('/e/:projectId', ...authMiddleware);
ingestRoute.use('/ping/:projectId', ...authMiddleware);

ingestRoute.get('/ping/:projectId', c => c.json({ ok: true }, 200));

ingestRoute.post('/e/:projectId', async c => {
  const projectId = c.get('projectId');
  const token = c.get('token');
  const ip = c.req.header('cf-connecting-ip') ?? c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
  const receivedAt = Date.now();

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400);
  }

  const events = Array.isArray(body) ? body : [body];
  if (events.length === 0) return c.json({ error: 'Empty batch' }, 400);

  // Daily quota — atomic per-token counter row in pulsify-db.
  const day = new Date().toISOString().slice(0, 10);
  const db = createPulsifyDb(c.env.PULSIFY_DB);
  const [usage] = await db
    .insert(dailyUsage)
    .values({ token, day, count: events.length })
    .onConflictDoUpdate({
      target: [dailyUsage.token, dailyUsage.day],
      set: { count: sql`${dailyUsage.count} + ${events.length}` },
    })
    .returning({ count: dailyUsage.count });

  if (usage && usage.count > DAILY_QUOTA) {
    const secondsUntilReset = Math.max(
      1,
      Math.ceil((new Date(`${day}T23:59:59.999Z`).getTime() + 1 - receivedAt) / 1000),
    );
    return c.json({ error: 'Daily event quota exceeded' }, 429, { 'Retry-After': String(secondsUntilReset) });
  }

  await enqueueEvents(
    c.env,
    events.map(event => ({ event, projectId, receivedAt, ip })),
  );

  return c.json({ accepted: events.length }, 202);
});
