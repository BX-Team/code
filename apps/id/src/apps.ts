import type { ConnectedApp } from '@bx-team/types/schema/bxid';
import { Hono } from 'hono';
import { db } from './db';
import { type Bindings, signedIn } from './session';

/** Apps this BX ID has signed in to, for the account page. */
export const apps = new Hono<Bindings>().use(signedIn).get('/', async c => {
  const rows = await db(c.env)
    .selectFrom('connectedApp')
    .select(['clientId', 'createdAt'])
    .where('userId', '=', c.get('userId'))
    .orderBy('createdAt')
    .execute();
  const list: ConnectedApp[] = rows.map(row => ({ clientId: row.clientId, connectedAt: row.createdAt }));
  return c.json({ apps: list });
});
