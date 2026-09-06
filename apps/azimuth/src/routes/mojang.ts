import {
  MojangProfileSchema,
  type SessionProfile,
  SessionProfileSchema,
  TexturesSchema,
  UsernameSchema,
} from '@bx-team/types/schema/mojang';
import { Hono } from 'hono';
import type { AppEnv } from '../context';
import { badRequest, internal, notFound, tooManyRequests } from '../util/error';

const CRAFTHEAD = 'https://crafthead.net/profile';
const MOJANG_PROFILE = 'https://api.mojang.com/users/profiles/minecraft';
const MOJANG_SESSION = 'https://sessionserver.mojang.com/session/minecraft/profile';

const JSON_HEADERS = { accept: 'application/json', 'user-agent': 'azimuth (+https://bxteam.org)' };

type Lookup = { kind: 'found'; profile: SessionProfile } | { kind: 'missing' } | { kind: 'failed'; status: number };

export const mojangRoutes = new Hono<AppEnv>();

mojangRoutes.get('/mojang/profile/:username', async c => {
  const parsed = UsernameSchema.safeParse(c.req.param('username'));
  if (!parsed.success) throw badRequest(parsed.error.issues[0]?.message ?? 'Invalid username');
  const username = parsed.data;

  let result = await fromMirror(username);
  if (result.kind === 'failed') {
    const direct = await fromMojang(username);
    if (direct.kind === 'failed') {
      console.error(`Username lookup failed: crafthead ${result.status}, Mojang ${direct.status}`);
      if (result.status === 429 || direct.status === 429) {
        throw tooManyRequests('The username lookup is being rate limited, try again shortly');
      }
      throw internal(`Username lookup failed (crafthead ${result.status}, Mojang ${direct.status})`);
    }
    result = direct;
  }

  if (result.kind === 'missing') throw notFound(`No Minecraft account named '${username}'`);

  c.header('Cache-Control', 'public, max-age=900, stale-while-revalidate=86400');

  const textures = skin(result.profile);
  return c.json({ id: dashed(result.profile.id), name: result.profile.name, ...textures });
});

async function fromMirror(username: string): Promise<Lookup> {
  const response = await fetch(`${CRAFTHEAD}/${encodeURIComponent(username)}`, { headers: JSON_HEADERS });
  if (response.status === 404) return { kind: 'missing' };
  if (!response.ok) return { kind: 'failed', status: response.status };

  const parsed = SessionProfileSchema.safeParse(await response.json());
  return parsed.success ? { kind: 'found', profile: parsed.data } : { kind: 'failed', status: response.status };
}

async function fromMojang(username: string): Promise<Lookup> {
  const lookup = await fetch(`${MOJANG_PROFILE}/${encodeURIComponent(username)}`, { headers: JSON_HEADERS });
  if (lookup.status === 404 || lookup.status === 204) return { kind: 'missing' };
  if (!lookup.ok) return { kind: 'failed', status: lookup.status };

  const profile = MojangProfileSchema.safeParse(await lookup.json());
  if (!profile.success) return { kind: 'failed', status: lookup.status };

  const session = await fetch(`${MOJANG_SESSION}/${profile.data.id}`, { headers: JSON_HEADERS });
  if (!session.ok) return { kind: 'failed', status: session.status };

  const parsed = SessionProfileSchema.safeParse(await session.json());
  return parsed.success ? { kind: 'found', profile: parsed.data } : { kind: 'failed', status: session.status };
}

function skin(profile: SessionProfile): { skin: string | null; cape: string | null; model: 'classic' | 'slim' } {
  const empty = { skin: null, cape: null, model: 'classic' as const };

  const property = profile.properties.find(item => item.name === 'textures');
  if (!property) return empty;

  const decoded = TexturesSchema.safeParse(parseJson(atob(property.value)));
  if (!decoded.success) return empty;

  const { SKIN, CAPE } = decoded.data.textures;
  return {
    // Handed out as plain http, which a page on https will not load.
    skin: SKIN ? SKIN.url.replace(/^http:/, 'https:') : null,
    cape: CAPE ? CAPE.url.replace(/^http:/, 'https:') : null,
    model: SKIN?.metadata?.model === 'slim' ? 'slim' : 'classic',
  };
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

const dashed = (id: string) =>
  `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`;
