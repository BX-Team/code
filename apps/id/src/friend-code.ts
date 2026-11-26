import type { DB } from './db';

/** Crockford base32: no I, L, O or U, so a code read aloud or retyped survives. */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const LENGTH = 8;

/** A code nobody has yet; 32^8 codes make a retry rare. */
export async function freshFriendCode(db: DB): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const bytes = crypto.getRandomValues(new Uint8Array(LENGTH));
    // 256 is a multiple of 32, so the modulo has no bias.
    const code = Array.from(bytes, b => ALPHABET[b % 32]).join('');
    const taken = await db.selectFrom('user').select('id').where('friendCode', '=', code).executeTakeFirst();
    if (!taken) return code;
  }
  throw new Error('No free friend code after 5 tries');
}

/** What a player typed, as stored: `k7f2-9qxm`, `K7F2 9QXM` and `K7F29QXM` are one code. */
export function normalizeFriendCode(typed: string): string {
  return typed.toUpperCase().replace(/[\s-]/g, '').replace(/[IL]/g, '1').replace(/O/g, '0');
}
