import type { ConnectedApp } from '@bx-team/types/schema/bxid';
import type { BxIdProduct } from '@bx-team/worker/bxid';
import { batch } from '@bx-team/worker/db';
import { notFound } from '@bx-team/worker/error';
import { Hono } from 'hono';
import { db } from './db';
import { origin, record } from './events';
import { forgetPlay } from './play/hub';
import { type Bindings, signedIn } from './session';

/** What disconnecting an app deletes: its products' data and, with `play`, friends and presence. */
const APP_DATA: Record<string, { products: (keyof Env & `PRODUCT_${string}`)[]; play: boolean; userAgent: RegExp }> = {
  riven: { products: ['PRODUCT_SKINS'], play: true, userAgent: /riven/i },
};

export const apps = new Hono<Bindings>().use(signedIn);

apps.get('/', async c => {
  const rows = await db(c.env)
    .selectFrom('connectedApp')
    .select(['clientId', 'createdAt'])
    .where('userId', '=', c.get('userId'))
    .orderBy('createdAt')
    .execute();
  const list: ConnectedApp[] = rows.map(row => ({ clientId: row.clientId, connectedAt: row.createdAt }));
  return c.json({ apps: list });
});

/** Signs the app out everywhere and deletes everything it kept. */
apps.delete('/:clientId', async c => {
  const userId = c.get('userId');
  const clientId = c.req.param('clientId');
  const app = APP_DATA[clientId];
  if (!app) throw notFound('No such app', 'APP_UNKNOWN');
  const q = db(c.env);

  // Sessions from before `clientId` was stored are told apart by the app's User-Agent.
  const sessions = await q
    .selectFrom('session')
    .select(['id', 'userAgent', 'clientId'])
    .where('userId', '=', userId)
    .execute();
  const ended = sessions
    .filter(s => s.clientId === clientId || (!s.clientId && app.userAgent.test(s.userAgent ?? '')))
    .map(s => s.id);

  await Promise.all(app.products.map(name => (c.env[name] as unknown as BxIdProduct).forget(userId)));
  if (app.play) await forgetPlay(c.env, userId);
  await batch(c.env.DB, [
    ...(ended.length ? [q.deleteFrom('session').where('id', 'in', ended)] : []),
    q.deleteFrom('connectedApp').where('userId', '=', userId).where('clientId', '=', clientId),
  ]);
  await record(c.env, userId, {
    kind: 'app-removed',
    detail: { clientId },
    ...origin(c.req.raw.headers, c.req.raw.cf),
  });
  return c.body(null, 204);
});
