import type { ActivityEvent } from '@bx-team/types/schema/bxid';
import { batch } from '@bx-team/worker/db';
import { limit } from '@bx-team/worker/flags';
import { place } from '@bx-team/worker/http';
import { db } from './db';

/** Where a request came from, with the city and country Cloudflare places it in. */
export interface Origin {
  ipAddress: string | null;
  userAgent: string | null;
  city: string | null;
  country: string | null;
}

export interface Happened extends Partial<Origin> {
  kind: ActivityEvent['kind'];
  detail?: Record<string, string | null>;
}

type Stores = Pick<Env, 'DB' | 'FLAGS'>;

/** Logs an event and drops the oldest past `activity-kept`; a failed write never fails what it describes. */
export async function record(env: Stores, userId: string, event: Happened) {
  try {
    const kept = await limit(env.FLAGS, 'activity-kept');
    const q = db(env as Env);
    await batch(env.DB, [
      q.insertInto('activity').values({
        id: crypto.randomUUID(),
        userId,
        kind: event.kind,
        detail: event.detail ? JSON.stringify(event.detail) : null,
        ipAddress: event.ipAddress ?? null,
        userAgent: event.userAgent ?? null,
        city: event.city ?? null,
        country: event.country ?? null,
        createdAt: new Date().toISOString(),
      }),
      q
        .deleteFrom('activity')
        .where('userId', '=', userId)
        .where(
          'id',
          'not in',
          q.selectFrom('activity').select('id').where('userId', '=', userId).orderBy('createdAt', 'desc').limit(kept),
        ),
    ]);
  } catch (e) {
    console.error('activity not recorded', event.kind, e);
  }
}

export function origin(headers?: Headers | null, cf?: unknown): Origin {
  return {
    ipAddress: headers?.get('cf-connecting-ip') ?? null,
    userAgent: headers?.get('user-agent') ?? null,
    ...place(cf),
  };
}

/** Notes the first sign-in of an app; later ones only show as sign-ins. */
export async function rememberApp(env: Stores, userId: string, clientId: string, from: Origin) {
  const inserted = await db(env as Env)
    .insertInto('connectedApp')
    .values({ userId, clientId, createdAt: new Date().toISOString() })
    .onConflict(oc => oc.doNothing())
    .executeTakeFirst();
  if (inserted.numInsertedOrUpdatedRows) await record(env, userId, { kind: 'app', detail: { clientId }, ...from });
}

/** Device codes live 30 minutes; a day keeps the table small without racing a slow approval. */
const KEPT_MS = 24 * 60 * 60 * 1000;

/** Better Auth's own form of a typed code: no dashes or spaces, upper case. */
export const normalizeUserCode = (code: string) => code.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

/** Notes who asked for a device code; failing here never fails the sign-in it is about. */
export async function rememberDeviceRequest(env: Env, userCode: string, from: Origin) {
  try {
    const q = db(env);
    const now = Date.now();
    await batch(env.DB, [
      q.deleteFrom('deviceRequest').where('createdAt', '<', new Date(now - KEPT_MS).toISOString()),
      q
        .insertInto('deviceRequest')
        .values({ userCode, ...from, createdAt: new Date(now).toISOString() })
        .onConflict(oc => oc.column('userCode').doUpdateSet({ ...from, createdAt: new Date(now).toISOString() })),
    ]);
  } catch (e) {
    console.error('device request not recorded', e);
  }
}
