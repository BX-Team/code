import {
  ClaimNickSchema,
  type MyProfiles,
  type MySkins,
  NickSchema,
  type Profile,
  SelectSkinSchema,
  type Skin,
  type SkinModel,
  SkinModelSchema,
} from '@bx-team/types/schema/skins';
import {
  badRequest,
  errorHandler,
  HttpError,
  notFound,
  notFoundHandler,
  payloadTooLarge,
  unauthorized,
  unavailable,
} from '@bx-team/worker/error';
import { isOn, limit } from '@bx-team/worker/flags';
import { sha256Hex } from '@bx-team/worker/hex';
import type { ExportedHandler } from '@cloudflare/workers-types';
import { Hono, type MiddlewareHandler } from 'hono';
import { cors } from 'hono/cors';
import type { z } from 'zod';
import type { Env } from './env';
import { isSkinSize, pngSize } from './png';

const PATH = '/v1/skins';
/** A 64×64 skin is a few KiB; this leaves room for any PNG encoder. */
const MAX_BYTES = 32 * 1024;
const RECENT = 12;
const DAY_MS = 24 * 60 * 60 * 1000;

type Vars = { userId: string };
const app = new Hono<{ Bindings: Env; Variables: Vars }>();

// Textures are public, as in the game; the rest needs the session, and so only the site's origins.
app.use(`${PATH}/textures/*`, cors({ origin: '*' }));
for (const path of [`${PATH}/me`, `${PATH}/profiles`, `${PATH}/profiles/*`]) {
  app.use(path, (c, next) =>
    cors({ origin: origins(c.env), credentials: true, allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'] })(
      c,
      next,
    ),
  );
}

const signedIn: MiddlewareHandler<{ Bindings: Env; Variables: Vars }> = async (c, next) => {
  const userId = await c.env.ID.userId({
    cookie: c.req.header('cookie'),
    authorization: c.req.header('authorization'),
  });
  if (!userId) throw unauthorized();
  c.set('userId', userId);
  await next();
};

app.get(`${PATH}/textures/:userId/:model/:file`, async c => {
  const { userId, model, file } = c.req.param();
  if (!SkinModelSchema.safeParse(model).success || !/^[0-9a-f]{64}\.png$/.test(file)) throw notFound('No such skin');
  const object = await c.env.TEXTURES.get(`${userId}/${model}/${file}`);
  if (!object) throw notFound('No such skin');
  return new Response(object.body as never, {
    headers: {
      'Content-Type': 'image/png',
      // The name is the content's hash, so it never changes.
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
      'Access-Control-Allow-Origin': '*',
    },
  });
});

app.use(`${PATH}/me`, signedIn);
app.use(`${PATH}/profiles`, signedIn);
app.use(`${PATH}/profiles/*`, signedIn);

app.get(`${PATH}/me`, async c => c.json({ recent: await recent(c.env, c.get('userId')) } satisfies MySkins));

app.get(`${PATH}/profiles`, async c => c.json(await mine(c.env, c.get('userId'))));

/** Claims a nick, or takes back one this BX ID released; 409 when someone else holds it. */
app.post(`${PATH}/profiles`, async c => {
  const userId = c.get('userId');
  const { name } = await parse(c.req.raw, ClaimNickSchema);
  const nameKey = name.toLowerCase();
  const now = new Date();
  const row = await c.env.DB.prepare(`select * from "profile" where "nameKey" = ?1`).bind(nameKey).first<Row>();

  if (row && row.userId === userId && !row.heldUntil) return c.json(profile(c.env, row));
  if (row && row.userId !== userId) {
    if (!row.heldUntil || new Date(row.heldUntil) > now) throw taken(name);
    await c.env.DB.prepare(`delete from "profile" where "nameKey" = ?1 and "heldUntil" = ?2`)
      .bind(nameKey, row.heldUntil)
      .run();
  }

  const count = await c.env.DB.prepare(
    `select count(*) as "n" from "profile" where "userId" = ?1 and "heldUntil" is null`,
  )
    .bind(userId)
    .first<number>('n');
  const max = await limit(c.env.FLAGS, 'nicks-per-account');
  if ((count ?? 0) >= max) throw badRequest(`A BX ID holds at most ${max} nicks; remove one first`);

  const id = await offlineUuid(name);
  if (row && row.userId === userId) {
    // Back from a release: same row, so the skin it wore comes back too; the case may have changed.
    await c.env.DB.prepare(`update "profile" set "id" = ?1, "name" = ?2, "heldUntil" = null where "nameKey" = ?3`)
      .bind(id, name, nameKey)
      .run();
  } else {
    const inserted = await c.env.DB.prepare(
      `insert into "profile" ("id", "userId", "name", "nameKey", "createdAt") values (?1, ?2, ?3, ?4, ?5)
       on conflict ("nameKey") do nothing`,
    )
      .bind(id, userId, name, nameKey, now.toISOString())
      .run();
    // Someone claimed it between the look-up and here.
    if (!inserted.meta.changes) throw taken(name);
  }
  announce(c, userId, { kind: 'nick-added', detail: { name } });
  const claimed = await find(c.env, userId, name);
  if (!claimed) throw notFound('No such nick');
  return c.json(profile(c.env, claimed), 201);
});

/** Releases a nick: for `nick-hold-days` only this BX ID can take it back. */
app.delete(`${PATH}/profiles/:name`, async c => {
  const userId = c.get('userId');
  const row = await owned(c.env, userId, c.req.param('name'));
  const days = await limit(c.env.FLAGS, 'nick-hold-days');
  await c.env.DB.prepare(`update "profile" set "heldUntil" = ?1 where "nameKey" = ?2`)
    .bind(new Date(Date.now() + days * DAY_MS).toISOString(), row.nameKey)
    .run();
  announce(c, userId, { kind: 'nick-removed', detail: { name: row.name } });
  return c.body(null, 204);
});

/** The PNG is the body; `?model=slim` picks Alex's arms. It joins the library and the nick wears it. */
app.put(`${PATH}/profiles/:name/skin`, async c => {
  const userId = c.get('userId');
  if (!(await isOn(c.env.FLAGS, 'skin-upload'))) throw unavailable('Skin uploads are off for now; try again later');
  const row = await owned(c.env, userId, c.req.param('name'));
  const model = SkinModelSchema.safeParse(c.req.query('model') ?? 'classic');
  if (!model.success) throw badRequest('model is classic or slim');
  const bytes = new Uint8Array(await c.req.arrayBuffer());
  if (bytes.length > MAX_BYTES) throw payloadTooLarge(`A skin is at most ${MAX_BYTES / 1024} KiB`);
  const size = pngSize(bytes);
  if (!size) throw badRequest('A skin is a PNG image');
  if (!isSkinSize(size)) throw badRequest(`A skin is 64×64 or 64×32 pixels, not ${size.width}×${size.height}`);
  const hash = await sha256Hex(bytes.buffer as ArrayBuffer);
  await c.env.TEXTURES.put(key(userId, model.data, hash), bytes, { httpMetadata: { contentType: 'image/png' } });
  return c.json(await wear(c, row, model.data, hash));
});

/** Wears a skin from the library, in either model. */
app.post(`${PATH}/profiles/:name/skin`, async c => {
  const userId = c.get('userId');
  const row = await owned(c.env, userId, c.req.param('name'));
  const { hash, model } = await parse(c.req.raw, SelectSkinSchema);
  if (!(await c.env.TEXTURES.head(key(userId, model, hash)))) {
    const other = model === 'slim' ? 'classic' : 'slim';
    const source = await c.env.TEXTURES.get(key(userId, other, hash));
    if (!source) throw notFound('No such skin');
    await c.env.TEXTURES.put(key(userId, model, hash), await source.arrayBuffer(), {
      httpMetadata: { contentType: 'image/png' },
    });
  }
  return c.json(await wear(c, row, model, hash));
});

/** Takes the nick's skin off; the PNG stays in the library. */
app.delete(`${PATH}/profiles/:name/skin`, async c => {
  const userId = c.get('userId');
  const row = await owned(c.env, userId, c.req.param('name'));
  await c.env.DB.prepare(`update "profile" set "model" = null, "hash" = null where "nameKey" = ?1`)
    .bind(row.nameKey)
    .run();
  announce(c, userId, { kind: 'skin', detail: { change: 'reset', name: row.name } });
  return c.body(null, 204);
});

app.onError(errorHandler);
app.notFound(notFoundHandler);

export default { fetch: app.fetch } satisfies ExportedHandler<Env>;

interface Row {
  id: string;
  userId: string;
  name: string;
  nameKey: string;
  model: SkinModel | null;
  hash: string | null;
  heldUntil: string | null;
}

type Ctx = { env: Env; req: { raw: Request }; executionCtx: { waitUntil(promise: Promise<unknown>): void } };

function taken(name: string) {
  return new HttpError(409, 'Conflict', `${name} belongs to another BX ID`);
}

function key(userId: string, model: SkinModel, hash: string) {
  return `${userId}/${model}/${hash}.png`;
}

function skin(env: Env, userId: string, model: SkinModel, hash: string): Skin {
  return { model, hash, url: `${env.BASE_URL}${PATH}/textures/${key(userId, model, hash)}` };
}

function profile(env: Env, row: Row): Profile {
  return {
    id: row.id,
    name: row.name,
    skin: row.model && row.hash ? skin(env, row.userId, row.model, row.hash) : null,
  };
}

async function mine(env: Env, userId: string): Promise<MyProfiles> {
  const { results } = await env.DB.prepare(`select * from "profile" where "userId" = ?1 order by "createdAt"`)
    .bind(userId)
    .all<Row>();
  const now = new Date();
  return {
    profiles: results.filter(row => !row.heldUntil).map(row => profile(env, row)),
    held: results
      .filter(row => row.heldUntil && new Date(row.heldUntil) > now)
      .map(row => ({ name: row.name, until: row.heldUntil as string })),
    limit: await limit(env.FLAGS, 'nicks-per-account'),
  };
}

async function find(env: Env, userId: string, name: string): Promise<Row | null> {
  return env.DB.prepare(`select * from "profile" where "nameKey" = ?1 and "userId" = ?2 and "heldUntil" is null`)
    .bind(name.toLowerCase(), userId)
    .first<Row>();
}

/** A nick this BX ID holds now, else 404. */
async function owned(env: Env, userId: string, name: string): Promise<Row> {
  const row = NickSchema.safeParse(name).success ? await find(env, userId, name) : null;
  if (!row) throw notFound('No such nick');
  return row;
}

async function wear(c: Ctx, row: Row, model: SkinModel, hash: string): Promise<Profile> {
  await c.env.DB.prepare(`update "profile" set "model" = ?1, "hash" = ?2 where "nameKey" = ?3`)
    .bind(model, hash, row.nameKey)
    .run();
  announce(c, row.userId, { kind: 'skin', detail: { change: 'wear', name: row.name } });
  return profile(c.env, { ...row, model, hash });
}

/** The player's other launchers pick the change up at once, and the account's activity notes it. */
function announce(
  c: Ctx,
  userId: string,
  event: { kind: 'nick-added' | 'nick-removed' | 'skin'; detail: Record<string, string> },
) {
  const headers = c.req.raw.headers;
  c.executionCtx.waitUntil(
    c.env.ID.profilesChanged(userId, {
      ...event,
      ipAddress: headers.get('cf-connecting-ip'),
      userAgent: headers.get('user-agent'),
    }),
  );
}

/** `UUID.nameUUIDFromBytes("OfflinePlayer:" + name)`, as an offline-mode server derives it; case matters. */
async function offlineUuid(name: string): Promise<string> {
  // Workers' Web Crypto has MD5, which browsers leave out.
  const digest = new Uint8Array(await crypto.subtle.digest('MD5', new TextEncoder().encode(`OfflinePlayer:${name}`)));
  digest[6] = ((digest[6] as number) & 0x0f) | 0x30;
  digest[8] = ((digest[8] as number) & 0x3f) | 0x80;
  return [...digest].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

/** Skins this BX ID uploaded, newest first, one entry per image. */
async function recent(env: Env, userId: string): Promise<Skin[]> {
  const listed = await env.TEXTURES.list({ prefix: `${userId}/`, limit: 100 });
  const seen = new Set<string>();
  return listed.objects
    .sort((a, b) => b.uploaded.getTime() - a.uploaded.getTime())
    .flatMap(object => {
      const [, model, file] = object.key.split('/');
      const hash = file?.replace(/\.png$/, '');
      const parsed = SkinModelSchema.safeParse(model);
      if (!hash || !parsed.success || seen.has(hash)) return [];
      seen.add(hash);
      return [skin(env, userId, parsed.data, hash)];
    })
    .slice(0, RECENT);
}

function origins(env: Env) {
  return env.TRUSTED_ORIGINS.split(',').map(origin => origin.trim());
}

async function parse<T extends z.ZodType>(request: Request, schema: T): Promise<z.infer<T>> {
  const body = await request.json().catch(() => {
    throw badRequest('Expected a JSON body');
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw badRequest(parsed.error.issues[0]?.message ?? 'Invalid body');
  return parsed.data;
}

export { SkinsService } from './service';
