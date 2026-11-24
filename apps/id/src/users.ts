import type { PlayUser } from '@bx-team/types/schema/play';
import type { D1Database } from '@cloudflare/workers-types';

interface UserRow {
  id: string;
  name: string;
  username: string | null;
  displayUsername: string | null;
  image: string | null;
  minecraft: string | null;
}

/** `code` as stored, see `normalizeFriendCode`. */
export async function findByFriendCode(db: D1Database, code: string): Promise<PlayUser | null> {
  const row = await query(db, `where u."friendCode" = ?1`, [code]).first<UserRow>();
  return row ? toUser(row) : null;
}

export async function profiles(db: D1Database, ids: string[]): Promise<PlayUser[]> {
  const found: PlayUser[] = [];
  // D1 binds at most 100 parameters per statement.
  for (let at = 0; at < ids.length; at += 100) {
    const chunk = ids.slice(at, at + 100);
    const marks = chunk.map((_, i) => `?${i + 1}`).join(', ');
    const { results } = await query(db, `where u."id" in (${marks})`, chunk).all<UserRow>();
    found.push(...results.map(toUser));
  }
  return found;
}

function query(db: D1Database, where: string, params: string[]) {
  return db
    .prepare(
      `select u."id", u."name", u."username", u."displayUsername", u."image",
         (select json_group_array(json_object('id', m."id", 'name', m."name"))
            from "minecraftProfile" m where m."userId" = u."id") as "minecraft"
       from "user" u ${where}`,
    )
    .bind(...params);
}

function toUser(row: UserRow): PlayUser {
  return {
    id: row.id,
    name: row.name,
    username: row.displayUsername ?? row.username,
    image: row.image,
    minecraft: row.minecraft ? JSON.parse(row.minecraft) : [],
  };
}
