import type { ActivityEvent, ActivityPage } from '@bx-team/types/schema/bxid';
import { badRequest } from '@bx-team/worker/error';
import { Hono } from 'hono';
import { db } from './db';
import { type Bindings, signedIn } from './session';

const PAGE = 20;

/** Newest first, a page at a time; `before` is the `next` of the previous page. */
export const activity = new Hono<Bindings>().use(signedIn).get('/', async c => {
  const before = c.req.query('before');
  const [at, id] = before ? before.split('|') : [];
  if (before && (!at || !id)) throw badRequest('Bad cursor');
  let query = db(c.env)
    .selectFrom('activity')
    .select(['id', 'kind', 'detail', 'ipAddress', 'userAgent', 'createdAt'])
    .where('userId', '=', c.get('userId'));
  if (at && id)
    query = query.where(eb => eb.or([eb('createdAt', '<', at), eb.and([eb('createdAt', '=', at), eb('id', '<', id)])]));
  const results = await query
    .orderBy('createdAt', 'desc')
    .orderBy('id', 'desc')
    .limit(PAGE + 1)
    .execute();
  const rows = results.slice(0, PAGE);
  const last = rows.at(-1);
  const page: ActivityPage = {
    events: rows.map(row => ({
      ...row,
      kind: row.kind as ActivityEvent['kind'],
      detail: row.detail ? JSON.parse(row.detail) : null,
    })),
    next: results.length > PAGE && last ? `${last.createdAt}|${last.id}` : null,
  };
  return c.json(page);
});
