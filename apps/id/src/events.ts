import type { ActivityEvent } from '@bx-team/types/schema/bxid';
import type { D1Database } from '@cloudflare/workers-types';

/** Older events past this many per BX ID are dropped as new ones come. */
const KEEP = 300;

export interface Happened {
  kind: ActivityEvent['kind'];
  detail?: Record<string, string | null>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/** Logs an event; a failed write never fails what it describes. */
export async function record(db: D1Database, userId: string, event: Happened) {
  try {
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
        .bind(userId, KEEP),
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
  db: D1Database,
  userId: string,
  clientId: string,
  from: Pick<Happened, 'ipAddress' | 'userAgent'>,
) {
  const { meta } = await db
    .prepare(
      `insert into "connectedApp" ("userId", "clientId", "createdAt") values (?1, ?2, ?3) on conflict do nothing`,
    )
    .bind(userId, clientId, new Date().toISOString())
    .run();
  if (meta.changes) await record(db, userId, { kind: 'app', detail: { clientId }, ...from });
}
