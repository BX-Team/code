import {
  PlayerDbResponseSchema,
  type SessionProfile,
  SessionProfileSchema,
  TexturesSchema,
} from '@bx-team/types/schema/mojang';

export interface MojangProfile {
  id: string;
  name: string;
  skin: string | null;
  cape: string | null;
  model: 'classic' | 'slim';
}

export const USERNAME_PATTERN = /^[A-Za-z0-9_]{1,16}$/;
export const UUID_PATTERN = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;

export class LookupError extends Error {}

type Lookup = { kind: 'found'; profile: SessionProfile } | { kind: 'missing' } | { kind: 'failed' };

/**
 * Mojang answers a Cloudflare Worker with 403 and sends no CORS headers to a browser, so
 * the lookup goes through two public mirrors that do: crafthead.net, then playerdb.co.
 * Takes a username or an online UUID.
 */
export async function fetchProfile(query: string): Promise<MojangProfile | null> {
  const key = UUID_PATTERN.test(query) ? undashed(query).toLowerCase() : query;

  let result = await fromCrafthead(key);
  if (result.kind === 'failed') result = await fromPlayerDb(key);
  if (result.kind === 'failed') throw new LookupError('Both lookup services failed, try again in a minute.');
  if (result.kind === 'missing') return null;

  return { id: dashed(result.profile.id), name: result.profile.name, ...textures(result.profile) };
}

async function fromCrafthead(key: string): Promise<Lookup> {
  try {
    const response = await fetch(`https://crafthead.net/profile/${encodeURIComponent(key)}`);
    if (response.status === 404 || response.status === 204) return { kind: 'missing' };
    if (!response.ok) return { kind: 'failed' };
    const parsed = SessionProfileSchema.safeParse(await response.json());
    return parsed.success ? { kind: 'found', profile: parsed.data } : { kind: 'failed' };
  } catch {
    return { kind: 'failed' };
  }
}

async function fromPlayerDb(key: string): Promise<Lookup> {
  try {
    const response = await fetch(`https://playerdb.co/api/player/minecraft/${encodeURIComponent(key)}`);
    const parsed = PlayerDbResponseSchema.safeParse(await response.json());
    if (!parsed.success) return { kind: 'failed' };
    const player = parsed.data.data.player;
    if (parsed.data.success && player) {
      return { kind: 'found', profile: { id: player.raw_id, name: player.username, properties: player.properties } };
    }
    return parsed.data.code.startsWith('minecraft.invalid') ? { kind: 'missing' } : { kind: 'failed' };
  } catch {
    return { kind: 'failed' };
  }
}

function textures(profile: SessionProfile): Pick<MojangProfile, 'skin' | 'cape' | 'model'> {
  const empty = { skin: null, cape: null, model: 'classic' as const };
  const property = profile.properties.find(item => item.name === 'textures');
  if (!property) return empty;

  let decoded: unknown;
  try {
    decoded = JSON.parse(atob(property.value));
  } catch {
    return empty;
  }
  const parsed = TexturesSchema.safeParse(decoded);
  if (!parsed.success) return empty;

  const { SKIN, CAPE } = parsed.data.textures;
  return {
    // Handed out as plain http, which a page on https will not load.
    skin: SKIN ? SKIN.url.replace(/^http:/, 'https:') : null,
    cape: CAPE ? CAPE.url.replace(/^http:/, 'https:') : null,
    model: SKIN?.metadata?.model === 'slim' ? 'slim' : 'classic',
  };
}

const ROTATIONS = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4,
  11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
];

const SINES = Uint32Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32));

/** Web Crypto stops at SHA-1, and the offline UUID is defined in terms of MD5. */
function md5(input: Uint8Array): Uint8Array {
  const length = input.length;
  const padded = new Uint8Array((((length + 8) >> 6) + 1) << 6);
  padded.set(input);
  padded[length] = 0x80;
  new DataView(padded.buffer).setUint32(padded.length - 8, length << 3, true);

  let [a, b, c, d] = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476];
  const words = new DataView(padded.buffer);
  const rotate = (value: number, by: number) => (value << by) | (value >>> (32 - by));

  for (let chunk = 0; chunk < padded.length; chunk += 64) {
    const [a0, b0, c0, d0] = [a, b, c, d];

    for (let i = 0; i < 64; i++) {
      let mixed: number;
      let index: number;
      if (i < 16) {
        mixed = (b & c) | (~b & d);
        index = i;
      } else if (i < 32) {
        mixed = (d & b) | (~d & c);
        index = (5 * i + 1) % 16;
      } else if (i < 48) {
        mixed = b ^ c ^ d;
        index = (3 * i + 5) % 16;
      } else {
        mixed = c ^ (b | ~d);
        index = (7 * i) % 16;
      }

      const sum = (a + mixed + (SINES[i] as number) + words.getUint32(chunk + index * 4, true)) | 0;
      [a, d, c] = [d, c, b];
      b = (b + rotate(sum, ROTATIONS[i] as number)) | 0;
    }

    a = (a + a0) | 0;
    b = (b + b0) | 0;
    c = (c + c0) | 0;
    d = (d + d0) | 0;
  }

  const digest = new Uint8Array(16);
  const out = new DataView(digest.buffer);
  out.setUint32(0, a, true);
  out.setUint32(4, b, true);
  out.setUint32(8, c, true);
  out.setUint32(12, d, true);
  return digest;
}

const hex = (bytes: Uint8Array) => [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');

export const dashed = (id: string) =>
  `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`;

export const undashed = (id: string) => id.replaceAll('-', '');

/** `UUID.nameUUIDFromBytes` over `OfflinePlayer:<name>`, exactly as an offline-mode
 *  server derives it. Case sensitive, because the server takes the name as it was sent. */
export function offlineUuid(username: string): string {
  const digest = md5(new TextEncoder().encode(`OfflinePlayer:${username}`));
  digest[6] = ((digest[6] as number) & 0x0f) | 0x30;
  digest[8] = ((digest[8] as number) & 0x3f) | 0x80;
  return dashed(hex(digest));
}
