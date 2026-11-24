import type { ActivityEvent, ActivityPage } from '@bx-team/types/schema/bxid';
import { badRequest } from '@bx-team/worker/error';
import { Hono } from 'hono';
import type { Env } from './env';
import { signedIn, type Vars } from './session';

const PAGE = 20;

interface Row {
  id: string;
  kind: ActivityEvent['kind'];
  detail: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

/** Newest first, a page at a time; `before` is the `next` of the previous page. */
export const activity = new Hono<{ Bindings: Env; Variables: Vars }>().use(signedIn).get('/', async c => {
  const before = c.req.query('before');
  const [at, id] = before ? before.split('|') : [];
  if (before && (!at || !id)) throw badRequest('Bad cursor');
  const { results } = await c.env.DB.prepare(
    `select "id", "kind", "detail", "ipAddress", "userAgent", "createdAt" from "activity"
     where "userId" = ?1 and (?2 is null or "createdAt" < ?2 or ("createdAt" = ?2 and "id" < ?3))
     order by "createdAt" desc, "id" desc limit ?4`,
  )
    .bind(c.get('userId'), at ?? null, id ?? null, PAGE + 1)
    .all<Row>();
  const rows = results.slice(0, PAGE);
  const last = rows.at(-1);
  const page: ActivityPage = {
    events: rows.map(row => ({ ...row, detail: row.detail ? JSON.parse(row.detail) : null })),
    next: results.length > PAGE && last ? `${last.createdAt}|${last.id}` : null,
  };
  return c.json(page);
});
