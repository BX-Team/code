import type { DeviceOrigin } from '@bx-team/types/schema/bxid';
import { place } from '@bx-team/worker/http';
import { Hono } from 'hono';
import { db } from './db';
import { normalizeUserCode } from './events';
import { type Bindings, signedIn } from './session';

/** Where a device code this BX ID claimed was asked for, and where the approver is now. */
export const device = new Hono<Bindings>().use(signedIn).get('/', async c => {
  const userCode = normalizeUserCode(c.req.query('user_code') ?? '');
  const claimed = await db(c.env)
    .selectFrom('deviceCode')
    .select('userCode')
    .where('userCode', '=', userCode)
    .where('userId', '=', c.get('userId'))
    .executeTakeFirst();
  const row = claimed
    ? await db(c.env).selectFrom('deviceRequest').selectAll().where('userCode', '=', userCode).executeTakeFirst()
    : undefined;
  const body: DeviceOrigin = {
    request: row
      ? {
          city: row.city,
          country: row.country,
          ipAddress: row.ipAddress,
          userAgent: row.userAgent,
          createdAt: row.createdAt,
        }
      : null,
    here: place(c.req.raw.cf),
  };
  return c.json(body);
});
