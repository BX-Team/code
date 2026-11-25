import type { ActivityEvent } from '@bx-team/types/schema/bxid';
import { limit } from '@bx-team/worker/flags';
import type { Env } from './env';

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
    const db = env.DB;
    await db.batch([
      db
        .prepare(
          `insert into "activity" ("id", "userId", "kind", "detail", "ipAddress", "userAgent", "createdAt")
           values (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
        )
        .bind(
          crypto.randomUUID(),
          userId,
          event.kind,
          event.detail ? JSON.stringify(event.detail) : null,
          event.ipAddress ?? null,
          event.userAgent ?? null,
          new Date().toISOString(),
        ),
      db
        .prepare(
          `delete from "activity" where "userId" = ?1 and "id" not in
             (select "id" from "activity" where "userId" = ?1 order by "createdAt" desc limit ?2)`,
        )
        .bind(userId, await limit(env.FLAGS, 'activity-kept')),
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
  const { meta } = await env.DB.prepare(
    `insert into "connectedApp" ("userId", "clientId", "createdAt") values (?1, ?2, ?3) on conflict do nothing`,
  )
    .bind(userId, clientId, new Date().toISOString())
    .run();
  if (meta.changes) await record(env, userId, { kind: 'app', detail: { clientId }, ...from });
}
