import { GameTokenSchema, HasJoinedQuerySchema, JoinSchema, NickSchema } from '@bx-team/types/schema/skins';
import { fromBase64, fromBase64Url, toBase64, toBase64Url } from '@bx-team/worker/base64';
import { batch } from '@bx-team/worker/db';
import { HttpError, notFound } from '@bx-team/worker/error';
import { valid } from '@bx-team/worker/http';
import { hmac, verifyHmac } from '@bx-team/worker/signature';
import type { Selectable } from 'kysely';
import { z } from 'zod';
import { app, type Ctx, db, signedIn } from './app';
import { textureUrl } from './profiles';
import type { ProfileTable } from './tables';

/** Mojang's session server paths, which the Riven agent sends here; see the agent's `Hooks.url`. */
const SESSION = '/v1/skins/session';
const TOKEN_DAYS = 7;
/** A server asks `hasJoined` right after the player's `join`; older ones are of no use. */
const JOIN_TTL_MS = 2 * 60 * 1000;
const RSA = { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-1' } as const;

type Row = Selectable<ProfileTable>;

app.get(`${SESSION}/publickey`, async c => c.json({ key: await publicKey(c.env) }));

/** A game token for one of this BX ID's nicks: the game hands it to `join` in place of a Microsoft token. */
app.post(`${SESSION}/token`, signedIn, valid('json', z.object({ name: NickSchema })), async c => {
  const { name } = c.req.valid('json');
  const row = await live(c.env)
    .where('nameKey', '=', name.toLowerCase())
    .where('userId', '=', c.get('userId'))
    .executeTakeFirst();
  if (!row) throw notFound('No such nick');
  const expires = Date.now() + TOKEN_DAYS * 24 * 60 * 60 * 1000;
  return c.json(
    GameTokenSchema.parse({
      token: await gameToken(c.env, row.userId, row.id, expires),
      expiresAt: new Date(expires).toISOString(),
    }),
  );
});

app.post(`${SESSION}/minecraft/join`, valid('json', JoinSchema), async c => {
  const { accessToken, selectedProfile, serverId } = c.req.valid('json');
  const claims = await readGameToken(c.env, accessToken);
  if (!claims || claims.profileId !== selectedProfile.toLowerCase()) return forbidden(c);
  // A nick released or taken over since the token was made no longer joins.
  const row = await live(c.env)
    .where('id', '=', claims.profileId)
    .where('userId', '=', claims.userId)
    .executeTakeFirst();
  if (!row) return forbidden(c);
  const now = Date.now();
  await batch(c.env.DB, [
    db(c.env)
      .deleteFrom('join')
      .where('createdAt', '<', now - JOIN_TTL_MS),
    db(c.env)
      .insertInto('join')
      .values({ serverId, nameKey: row.nameKey, profileId: row.id, createdAt: now })
      .onConflict(oc => oc.columns(['serverId', 'nameKey']).doUpdateSet({ profileId: row.id, createdAt: now })),
  ]);
  return c.body(null, 204);
});

/** A Riven player's join answers here; everyone else's goes on to Mojang, whose answer comes back untouched. */
app.get(`${SESSION}/minecraft/hasJoined`, valid('query', HasJoinedQuerySchema), async c => {
  const row = await joined(c);
  if (row) return c.json(await gameProfile(c.env, row, true));
  return mojang(c, new URL(c.req.url).search);
});

/**
 * The same for servers that ask Mojang themselves first, in authlib-injector's layout (`<root>/sessionserver/...`),
 * as DivineMC's and Leaves' extra Yggdrasil services do: Riven's players only, never Mojang again.
 */
app.get('/v1/skins/sessionserver/session/minecraft/hasJoined', valid('query', HasJoinedQuerySchema), async c => {
  const row = await joined(c);
  return row ? c.json(await gameProfile(c.env, row, true)) : c.body(null, 204);
});

app.get(`${SESSION}/minecraft/profile/:id`, async c => {
  const row = await live(c.env).where('id', '=', c.req.param('id').replace(/-/g, '').toLowerCase()).executeTakeFirst();
  if (!row) return c.body(null, 204);
  return c.json(await gameProfile(c.env, row, c.req.query('unsigned') === 'false'));
});

/** Nicks someone holds now; a released one is nobody's in the game. */
function live(env: Env) {
  return db(env).selectFrom('profile').selectAll().where('heldUntil', 'is', null);
}

/** The nick that just joined `serverId` with a Riven game token, if any. */
async function joined(c: Ctx): Promise<Row | undefined> {
  const { username, serverId } = HasJoinedQuerySchema.parse(c.req.query());
  return db(c.env)
    .selectFrom('join')
    .innerJoin('profile', 'profile.id', 'join.profileId')
    .selectAll('profile')
    .where('join.serverId', '=', serverId)
    .where('join.nameKey', '=', username.toLowerCase())
    .where('join.createdAt', '>=', Date.now() - JOIN_TTL_MS)
    .where('profile.heldUntil', 'is', null)
    .executeTakeFirst();
}

function forbidden(c: Ctx) {
  // authlib reads Mojang's error shape, not ours.
  return c.json({ error: 'ForbiddenOperationException', errorMessage: 'Invalid token.' }, 403);
}

async function mojang(c: Ctx, search: string): Promise<Response> {
  const url = new URL('/session/minecraft/hasJoined', c.env.MOJANG_PROXY_URL);
  url.search = search;
  const response = await fetch(url, { headers: { 'X-Proxy-Key': c.env.MOJANG_PROXY_KEY } }).catch(() => null);
  if (!response || response.status >= 500 || response.status === 403 || response.status === 429)
    throw new HttpError(503, 'Service Unavailable', 'Mojang cannot be reached');
  return new Response(response.body, {
    status: response.status,
    headers: { 'Content-Type': response.headers.get('Content-Type') ?? 'application/json' },
  });
}

/** The profile as Mojang's session server shapes it; `signed` adds the signature the game checks. */
async function gameProfile(env: Env, row: Row, signed: boolean) {
  const textures: Record<string, unknown> = {};
  if (row.model && row.hash) {
    textures.SKIN = {
      url: textureUrl(env, row.userId, row.model, row.hash),
      ...(row.model === 'slim' ? { metadata: { model: 'slim' } } : {}),
    };
  }
  const value = btoa(
    JSON.stringify({
      timestamp: Date.now(),
      profileId: row.id,
      profileName: row.name,
      signatureRequired: signed,
      textures,
    }),
  );
  const property: { name: string; value: string; signature?: string } = { name: 'textures', value };
  if (signed) property.signature = await signTextures(env, value);
  return { id: row.id, name: row.name, properties: [property] };
}

function signingKey(env: Env, extractable: boolean) {
  const der = fromBase64(env.TEXTURES_SIGNING_KEY);
  if (!der) throw new Error('TEXTURES_SIGNING_KEY is not base64');
  return crypto.subtle.importKey('pkcs8', der, RSA, extractable, ['sign']);
}

/** SHA1withRSA over the base64 text, as authlib verifies Mojang's own. */
async function signTextures(env: Env, value: string): Promise<string> {
  return toBase64(await crypto.subtle.sign(RSA.name, await signingKey(env, false), new TextEncoder().encode(value)));
}

/** The signing key's public half, X.509 in base64, as the agent takes it. */
async function publicKey(env: Env): Promise<string> {
  const { n, e } = (await crypto.subtle.exportKey('jwk', await signingKey(env, true))) as JsonWebKey;
  const pub = await crypto.subtle.importKey('jwk', { kty: 'RSA', n, e, alg: 'RS1', ext: true }, RSA, true, ['verify']);
  return toBase64((await crypto.subtle.exportKey('spki', pub)) as ArrayBuffer);
}

const ClaimsSchema = z.object({ u: z.string(), p: z.string(), e: z.number() });

/** `rgt1.<claims>.<mac>`: stateless, so a join costs no look-up; the nick is checked again at `join`. */
async function gameToken(env: Env, userId: string, profileId: string, expires: number): Promise<string> {
  const claims = toBase64Url(new TextEncoder().encode(JSON.stringify({ u: userId, p: profileId, e: expires })));
  return `rgt1.${claims}.${toBase64Url(await hmac(env.GAME_TOKEN_SECRET, claims))}`;
}

async function readGameToken(env: Env, token: string): Promise<{ userId: string; profileId: string } | null> {
  const [prefix, claims, mac] = token.split('.');
  if (prefix !== 'rgt1' || !claims || !mac) return null;
  const signature = fromBase64Url(mac);
  if (!signature || !(await verifyHmac(env.GAME_TOKEN_SECRET, signature, claims))) return null;
  const decoded = fromBase64Url(claims);
  if (!decoded) return null;
  let json: unknown;
  try {
    json = JSON.parse(new TextDecoder().decode(decoded));
  } catch {
    return null;
  }
  const parsed = ClaimsSchema.safeParse(json);
  if (!parsed.success || parsed.data.e < Date.now()) return null;
  return { userId: parsed.data.u, profileId: parsed.data.p };
}
