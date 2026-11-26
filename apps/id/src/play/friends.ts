import type { DB } from '../db';

/** Keeps one account's fan-out (presence to every friend) bounded. */
export const MAX_FRIENDS = 200;

export interface Friendships {
  accepted: string[];
  incoming: string[];
  outgoing: string[];
}

export async function friendships(db: DB, userId: string): Promise<Friendships> {
  const rows = await db
    .selectFrom('friendship')
    .select(['userId', 'friendId', 'status'])
    .where(eb => eb.or([eb('userId', '=', userId), eb('friendId', '=', userId)]))
    .orderBy('createdAt')
    .execute();
  const out: Friendships = { accepted: [], incoming: [], outgoing: [] };
  for (const row of rows) {
    const other = row.userId === userId ? row.friendId : row.userId;
    if (row.status === 'accepted') out.accepted.push(other);
    else if (row.userId === userId) out.outgoing.push(other);
    else out.incoming.push(other);
  }
  return out;
}

export async function friendIds(db: DB, userId: string): Promise<string[]> {
  return (await friendships(db, userId)).accepted;
}

function between(db: DB, a: string, b: string) {
  return db
    .selectFrom('friendship')
    .select(['userId', 'friendId', 'status'])
    .where(eb =>
      eb.or([
        eb.and([eb('userId', '=', a), eb('friendId', '=', b)]),
        eb.and([eb('userId', '=', b), eb('friendId', '=', a)]),
      ]),
    );
}

export async function areFriends(db: DB, a: string, b: string): Promise<boolean> {
  return (await between(db, a, b).executeTakeFirst())?.status === 'accepted';
}

/** Asks `to` to be friends, or accepts their request when they have already asked `from`. */
export async function request(db: DB, from: string, to: string): Promise<'requested' | 'accepted' | 'exists'> {
  const existing = await between(db, from, to).executeTakeFirst();
  if (existing?.status === 'pending' && existing.userId === to) {
    await accept(db, from, to);
    return 'accepted';
  }
  if (existing) return 'exists';
  await db
    .insertInto('friendship')
    .values({ userId: from, friendId: to, status: 'pending', createdAt: new Date().toISOString() })
    .execute();
  return 'requested';
}

/** Accepts the request `from` sent to `userId`; false when there is none. */
export async function accept(db: DB, userId: string, from: string): Promise<boolean> {
  const updated = await db
    .updateTable('friendship')
    .set({ status: 'accepted' })
    .where('userId', '=', from)
    .where('friendId', '=', userId)
    .where('status', '=', 'pending')
    .executeTakeFirst();
  return updated.numUpdatedRows > 0n;
}

/** Removes a friend, declines an incoming request or cancels an outgoing one. */
export async function remove(db: DB, a: string, b: string): Promise<boolean> {
  const deleted = await db
    .deleteFrom('friendship')
    .where(eb =>
      eb.or([
        eb.and([eb('userId', '=', a), eb('friendId', '=', b)]),
        eb.and([eb('userId', '=', b), eb('friendId', '=', a)]),
      ]),
    )
    .executeTakeFirst();
  return deleted.numDeletedRows > 0n;
}
