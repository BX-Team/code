import type { ActivityEvent } from '@bx-team/types/schema/bxid';
import { batch } from '@bx-team/worker/db';
import { limit } from '@bx-team/worker/flags';
import { db } from './db';

export interface Happened {
  kind: ActivityEvent['kind'];
  detail?: Record<string, string | null>;
  ipAddress?: string | null;
  userAgent?: string | null;
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

/** Where a request came from, as Better Auth stores it on sessions. */
export function origin(headers?: Headers | null): Pick<Happened, 'ipAddress' | 'userAgent'> {
  return { ipAddress: headers?.get('cf-connecting-ip') ?? null, userAgent: headers?.get('user-agent') ?? null };
}

/** Notes the first sign-in of an app; later ones only show as sign-ins. */
export async function rememberApp(
  env: Stores,
  userId: string,
  clientId: string,
  from: Pick<Happened, 'ipAddress' | 'userAgent'>,
) {
  const inserted = await db(env as Env)
    .insertInto('connectedApp')
    .values({ userId, clientId, createdAt: new Date().toISOString() })
    .onConflict(oc => oc.doNothing())
    .executeTakeFirst();
  if (inserted.numInsertedOrUpdatedRows) await record(env, userId, { kind: 'app', detail: { clientId }, ...from });
}
