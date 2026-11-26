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
import { bxid } from '@bx-team/worker/bxid';
import { badRequest, HttpError, notFound, payloadTooLarge, unavailable } from '@bx-team/worker/error';
import { isOn, limit } from '@bx-team/worker/flags';
import { sha256Hex } from '@bx-team/worker/hex';
import { valid } from '@bx-team/worker/http';
import type { Selectable } from 'kysely';
import { z } from 'zod';
import { app, type Ctx, db, signedIn } from './app';
import { offlineUuid } from './offline';
import { isSkinSize, pngSize } from './png';
import type { ProfileTable } from './tables';

const PATH = '/v1/skins';
/** A 64×64 skin is a few KiB; this leaves room for any PNG encoder. */
const MAX_BYTES = 32 * 1024;
const RECENT = 12;
const DAY_MS = 24 * 60 * 60 * 1000;

type Row = Selectable<ProfileTable>;

app.get(`${PATH}/textures/:userId/:model/:file`, async c => {
  const { userId, model, file } = c.req.param();
  if (!SkinModelSchema.safeParse(model).success || !/^[0-9a-f]{64}\.png$/.test(file)) throw notFound('No such skin');
  const object = await c.env.TEXTURES.get(`${userId}/${model}/${file}`);
  if (!object) throw notFound('No such skin');
  return new Response(object.body, {
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
app.post(`${PATH}/profiles`, valid('json', ClaimNickSchema), async c => {
  const userId = c.get('userId');
  const { name } = c.req.valid('json');
  const nameKey = name.toLowerCase();
  const now = new Date();
  const row = await db(c.env).selectFrom('profile').selectAll().where('nameKey', '=', nameKey).executeTakeFirst();

  if (row && row.userId === userId && !row.heldUntil) return c.json(profile(c.env, row));
  // Servers that let in both Mojang's players and ours tell them apart only by name.
  if (await mojangHas(c.env, name)) throw new HttpError(409, 'Conflict', `${name} is a Minecraft account's name`);
  if (row && row.userId !== userId) {
    if (!row.heldUntil || new Date(row.heldUntil) > now) throw taken(name);
    await db(c.env)
      .deleteFrom('profile')
      .where('nameKey', '=', nameKey)
      .where('heldUntil', '=', row.heldUntil)
      .execute();
  }

  const { count } = await db(c.env)
    .selectFrom('profile')
    .select(eb => eb.fn.countAll<number>().as('count'))
    .where('userId', '=', userId)
    .where('heldUntil', 'is', null)
    .executeTakeFirstOrThrow();
  const max = await limit(c.env.FLAGS, 'nicks-per-account');
  if (count >= max) throw badRequest(`A BX ID holds at most ${max} nicks; remove one first`);

  const id = await offlineUuid(name);
  if (row && row.userId === userId) {
    // Back from a release: same row, so the skin it wore comes back too; the case may have changed.
    await db(c.env).updateTable('profile').set({ id, name, heldUntil: null }).where('nameKey', '=', nameKey).execute();
  } else {
    const inserted = await db(c.env)
      .insertInto('profile')
      .values({ id, userId, name, nameKey, createdAt: now.toISOString() })
      .onConflict(oc => oc.column('nameKey').doNothing())
      .executeTakeFirst();
    // Someone claimed it between the look-up and here.
    if (!inserted.numInsertedOrUpdatedRows) throw taken(name);
  }
  announce(c, userId, { kind: 'nick-added', detail: { name } });
  return c.json(profile(c.env, await owned(c.env, userId, name)), 201);
});

/** Releases a nick: for `nick-hold-days` only this BX ID can take it back. */
app.delete(`${PATH}/profiles/:name`, async c => {
  const userId = c.get('userId');
  const row = await owned(c.env, userId, c.req.param('name'));
  const days = await limit(c.env.FLAGS, 'nick-hold-days');
  await db(c.env)
    .updateTable('profile')
    .set({ heldUntil: new Date(Date.now() + days * DAY_MS).toISOString() })
    .where('nameKey', '=', row.nameKey)
    .execute();
  announce(c, userId, { kind: 'nick-removed', detail: { name: row.name } });
  return c.body(null, 204);
});

/** The PNG is the body; `?model=slim` picks Alex's arms. It joins the library and the nick wears it. */
app.put(
  `${PATH}/profiles/:name/skin`,
  valid('query', z.object({ model: SkinModelSchema.default('classic') })),
  async c => {
    const userId = c.get('userId');
    if (!(await isOn(c.env.FLAGS, 'skin-upload'))) throw unavailable('Skin uploads are off for now; try again later');
    const row = await owned(c.env, userId, c.req.param('name'));
    const { model } = c.req.valid('query');
    const bytes = new Uint8Array(await c.req.arrayBuffer());
    if (bytes.length > MAX_BYTES) throw payloadTooLarge(`A skin is at most ${MAX_BYTES / 1024} KiB`);
    const size = pngSize(bytes);
    if (!size) throw badRequest('A skin is a PNG image');
    if (!isSkinSize(size)) throw badRequest(`A skin is 64×64 or 64×32 pixels, not ${size.width}×${size.height}`);
    const hash = await sha256Hex(bytes.buffer);
    await c.env.TEXTURES.put(key(userId, model, hash), bytes, { httpMetadata: { contentType: 'image/png' } });
    return c.json(await wear(c, row, model, hash));
  },
);

/** Wears a skin from the library, in either model. */
app.post(`${PATH}/profiles/:name/skin`, valid('json', SelectSkinSchema), async c => {
  const userId = c.get('userId');
  const row = await owned(c.env, userId, c.req.param('name'));
  const { hash, model } = c.req.valid('json');
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
  await db(c.env).updateTable('profile').set({ model: null, hash: null }).where('nameKey', '=', row.nameKey).execute();
  announce(c, userId, { kind: 'skin', detail: { change: 'reset', name: row.name } });
  return c.body(null, 204);
});

function taken(name: string) {
  return new HttpError(409, 'Conflict', `${name} belongs to another BX ID`);
}

function key(userId: string, model: SkinModel, hash: string) {
  return `${userId}/${model}/${hash}.png`;
}

export function textureUrl(env: Env, userId: string, model: SkinModel, hash: string): string {
  return `${env.BASE_URL}${PATH}/textures/${key(userId, model, hash)}`;
}

function skin(env: Env, userId: string, model: SkinModel, hash: string): Skin {
  return { model, hash, url: textureUrl(env, userId, model, hash) };
}

function profile(env: Env, row: Row): Profile {
  return {
    id: row.id,
    name: row.name,
    skin: row.model && row.hash ? skin(env, row.userId, row.model, row.hash) : null,
  };
}

async function mine(env: Env, userId: string): Promise<MyProfiles> {
  const rows = await db(env)
    .selectFrom('profile')
    .selectAll()
    .where('userId', '=', userId)
    .orderBy('createdAt')
    .execute();
  const now = new Date();
  return {
    profiles: rows.filter(row => !row.heldUntil).map(row => profile(env, row)),
    held: rows.flatMap(row =>
      row.heldUntil && new Date(row.heldUntil) > now ? [{ name: row.name, until: row.heldUntil }] : [],
    ),
    limit: await limit(env.FLAGS, 'nicks-per-account'),
  };
}

/** A nick this BX ID holds now, else 404. */
async function owned(env: Env, userId: string, name: string): Promise<Row> {
  const row = NickSchema.safeParse(name).success
    ? await db(env)
        .selectFrom('profile')
        .selectAll()
        .where('nameKey', '=', name.toLowerCase())
        .where('userId', '=', userId)
        .where('heldUntil', 'is', null)
        .executeTakeFirst()
    : undefined;
  if (!row) throw notFound('No such nick');
  return row;
}

async function wear(c: Ctx, row: Row, model: SkinModel, hash: string): Promise<Profile> {
  await db(c.env).updateTable('profile').set({ model, hash }).where('nameKey', '=', row.nameKey).execute();
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
    bxid(c.env).profilesChanged(userId, {
      ...event,
      ipAddress: headers.get('cf-connecting-ip'),
      userAgent: headers.get('user-agent'),
    }),
  );
}

/** Whether a Microsoft account has this name; Mojang unreachable is no answer, so the claim waits. */
async function mojangHas(env: Env, name: string): Promise<boolean> {
  const response = await fetch(new URL(`/users/profiles/minecraft/${encodeURIComponent(name)}`, env.MOJANG_API_URL), {
    headers: { 'X-Proxy-Key': env.MOJANG_PROXY_KEY },
  }).catch(() => null);
  if (response?.status === 200) return true;
  if (response?.status === 204 || response?.status === 404) return false;
  throw unavailable('Cannot check the name with Mojang right now; try again later');
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
