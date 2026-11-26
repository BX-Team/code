import type { DB } from './db';

/** The username plugin's own limits; a name made here must pass its validator later on update. */
const MIN = 3;
const MAX = 30;

/** Fits a provider handle, a display name or an email's local part into `[a-zA-Z0-9_.]`, or gives up. */
function toUsername(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/[\s-]+/g, '_')
    .replace(/[^a-zA-Z0-9_.]/g, '')
    .replace(/[_.]{2,}/g, '_')
    .replace(/^[_.]+|[_.]+$/g, '')
    .slice(0, MAX - 4);
  return cleaned.length >= MIN ? cleaned : null;
}

/** The first candidate that fits, with a number added while it is taken; `player1234` when none fits. */
export async function freshUsername(
  db: DB,
  candidates: (string | null | undefined)[],
): Promise<{ username: string; displayUsername: string }> {
  const base = candidates.map(toUsername).find(Boolean) ?? 'player';
  for (let attempt = 0; attempt < 8; attempt++) {
    const digits = attempt === 0 && base !== 'player' ? '' : String(1000 + Math.floor(Math.random() * 9000));
    const shown = `${base}${digits}`;
    const username = shown.toLowerCase();
    const taken = await db.selectFrom('user').select('id').where('username', '=', username).executeTakeFirst();
    if (!taken) return { username, displayUsername: shown };
  }
  throw new Error('No free username after 8 tries');
}
