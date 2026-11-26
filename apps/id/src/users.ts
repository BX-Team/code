import type { PlayUser } from '@bx-team/types/schema/play';
import type { DB } from './db';

/** `code` as stored, see `normalizeFriendCode`. */
export async function findByFriendCode(db: DB, code: string): Promise<PlayUser | null> {
  const row = await select(db).where('friendCode', '=', code).executeTakeFirst();
  return row ? toUser(row) : null;
}

export async function profiles(db: DB, ids: string[]): Promise<PlayUser[]> {
  const found: PlayUser[] = [];
  // D1 binds at most 100 parameters per statement.
  for (let at = 0; at < ids.length; at += 100) {
    const rows = await select(db)
      .where('id', 'in', ids.slice(at, at + 100))
      .execute();
    found.push(...rows.map(toUser));
  }
  return found;
}

function select(db: DB) {
  return db.selectFrom('user').select(['id', 'name', 'username', 'displayUsername', 'image']);
}

function toUser(row: {
  id: string;
  name: string;
  username: string | null;
  displayUsername: string | null;
  image: string | null;
}): PlayUser {
  return { id: row.id, name: row.name, username: row.displayUsername ?? row.username, image: row.image };
}
