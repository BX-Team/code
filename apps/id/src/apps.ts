import type { ConnectedApp } from '@bx-team/types/schema/bxid';
import { Hono } from 'hono';
import type { Env } from './env';
import { signedIn, type Vars } from './session';

/** Apps this BX ID has signed in to, for the account page. */
export const apps = new Hono<{ Bindings: Env; Variables: Vars }>().use(signedIn).get('/', async c => {
  const { results } = await c.env.DB.prepare(
    `select "clientId", "createdAt" from "connectedApp" where "userId" = ?1 order by "createdAt"`,
  )
    .bind(c.get('userId'))
    .all<{ clientId: string; createdAt: string }>();
  const list: ConnectedApp[] = results.map(row => ({ clientId: row.clientId, connectedAt: row.createdAt }));
  return c.json({ apps: list });
});
