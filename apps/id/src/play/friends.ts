import type { D1Database } from '@cloudflare/workers-types';

/** Keeps one account's fan-out (presence to every friend) bounded. */
export const MAX_FRIENDS = 200;
export const MAX_PENDING = 50;

interface Row {
  userId: string;
  friendId: string;
  status: 'pending' | 'accepted';
}

export interface Friendships {
  accepted: string[];
  incoming: string[];
  outgoing: string[];
}

export async function friendships(db: D1Database, userId: string): Promise<Friendships> {
  const { results } = await db
    .prepare(
      `select "userId", "friendId", "status", "createdAt" from "friendship" where "userId" = ?1
       union all
       select "userId", "friendId", "status", "createdAt" from "friendship" where "friendId" = ?1
       order by "createdAt"`,
    )
    .bind(userId)
    .all<Row>();

  const out: Friendships = { accepted: [], incoming: [], outgoing: [] };
  for (const row of results) {
    const other = row.userId === userId ? row.friendId : row.userId;
    if (row.status === 'accepted') out.accepted.push(other);
    else if (row.userId === userId) out.outgoing.push(other);
    else out.incoming.push(other);
  }
  return out;
}

export async function friendIds(db: D1Database, userId: string): Promise<string[]> {
  return (await friendships(db, userId)).accepted;
}

export async function areFriends(db: D1Database, a: string, b: string): Promise<boolean> {
  const row = await db
    .prepare(
      `select 1 from "friendship" where "status" = 'accepted'
       and (("userId" = ?1 and "friendId" = ?2) or ("userId" = ?2 and "friendId" = ?1))`,
    )
    .bind(a, b)
    .first();
  return row !== null;
}

/** Asks `to` to be friends, or accepts their request when they have already asked `from`. */
export async function request(db: D1Database, from: string, to: string): Promise<'requested' | 'accepted' | 'exists'> {
  const existing = await db
    .prepare(
      `select "userId", "friendId", "status" from "friendship"
       where ("userId" = ?1 and "friendId" = ?2) or ("userId" = ?2 and "friendId" = ?1)`,
    )
    .bind(from, to)
    .first<Row>();

  if (existing?.status === 'pending' && existing.userId === to) {
    await accept(db, from, to);
    return 'accepted';
  }
  if (existing) return 'exists';

  await db
    .prepare(`insert into "friendship" ("userId", "friendId", "status", "createdAt") values (?1, ?2, 'pending', ?3)`)
    .bind(from, to, new Date().toISOString())
    .run();
  return 'requested';
}

/** Accepts the request `from` sent to `userId`; false when there is none. */
export async function accept(db: D1Database, userId: string, from: string): Promise<boolean> {
  const { meta } = await db
    .prepare(
      `update "friendship" set "status" = 'accepted' where "userId" = ?1 and "friendId" = ?2 and "status" = 'pending'`,
    )
    .bind(from, userId)
    .run();
  return meta.changes > 0;
}

/** Removes a friend, declines an incoming request or cancels an outgoing one. */
export async function remove(db: D1Database, a: string, b: string): Promise<boolean> {
  const { meta } = await db
    .prepare(
      `delete from "friendship" where ("userId" = ?1 and "friendId" = ?2) or ("userId" = ?2 and "friendId" = ?1)`,
    )
    .bind(a, b)
    .run();
  return meta.changes > 0;
}
