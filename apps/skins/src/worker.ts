import {
  type MySkins,
  SelectSkinSchema,
  type Skin,
  SkinLookupSchema,
  type SkinModel,
  SkinModelSchema,
  type SkinsById,
  type UserSkin,
} from '@bx-team/types/schema/skins';
import {
  badRequest,
  errorHandler,
  notFound,
  notFoundHandler,
  payloadTooLarge,
  unauthorized,
  unavailable,
} from '@bx-team/worker/error';
import { isOn } from '@bx-team/worker/flags';
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

type Vars = { userId: string };
const app = new Hono<{ Bindings: Env; Variables: Vars }>();

// Skins are public, as in the game; only `/me` needs the session, and so only the site's origins.
app.use(`${PATH}/me`, (c, next) =>
  cors({ origin: origins(c.env), credentials: true, allowMethods: ['GET', 'PUT', 'DELETE', 'OPTIONS'] })(c, next),
);
app.use(`${PATH}/me/*`, (c, next) =>
  cors({ origin: origins(c.env), credentials: true, allowMethods: ['POST', 'OPTIONS'] })(c, next),
);
app.use(`${PATH}/users/*`, cors({ origin: '*' }));
app.use(`${PATH}/lookup`, cors({ origin: '*', allowMethods: ['POST', 'OPTIONS'] }));
app.use(`${PATH}/textures/*`, cors({ origin: '*' }));

const signedIn: MiddlewareHandler<{ Bindings: Env; Variables: Vars }> = async (c, next) => {
  const userId = await c.env.ID.userId({
    cookie: c.req.header('cookie'),
    authorization: c.req.header('authorization'),
  });
  if (!userId) throw unauthorized();
  c.set('userId', userId);
  await next();
};

app.get(`${PATH}/users/:id`, async c => {
  c.header('Cache-Control', 'public, max-age=60');
  return c.json({ skin: await current(c.env, c.req.param('id')) } satisfies UserSkin);
});

app.post(`${PATH}/lookup`, async c => {
  const { ids } = await parse(c.req.raw, SkinLookupSchema);
  const skins: SkinsById['skins'] = {};
  // D1 binds at most 100 parameters per statement.
  for (let at = 0; at < ids.length; at += 100) {
    const chunk = ids.slice(at, at + 100);
    const marks = chunk.map((_, i) => `?${i + 1}`).join(', ');
    const { results } = await c.env.DB.prepare(
      `select "userId", "model", "hash" from "skin" where "userId" in (${marks})`,
    )
      .bind(...chunk)
      .all<Row>();
    for (const row of results) skins[row.userId] = skin(c.env, row.userId, row.model, row.hash);
  }
  return c.json({ skins } satisfies SkinsById);
});

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
app.use(`${PATH}/me/*`, signedIn);

app.get(`${PATH}/me`, async c => {
  const userId = c.get('userId');
  return c.json({ skin: await current(c.env, userId), recent: await recent(c.env, userId) } satisfies MySkins);
});

/** The PNG is the body; `?model=slim` picks Alex's arms. */
app.put(`${PATH}/me`, async c => {
  const userId = c.get('userId');
  if (!(await isOn(c.env.FLAGS, 'skin-upload'))) throw unavailable('Skin uploads are off for now; try again later');
  const model = SkinModelSchema.safeParse(c.req.query('model') ?? 'classic');
  if (!model.success) throw badRequest('model is classic or slim');
  const bytes = new Uint8Array(await c.req.arrayBuffer());
  if (bytes.length > MAX_BYTES) throw payloadTooLarge(`A skin is at most ${MAX_BYTES / 1024} KiB`);
  const size = pngSize(bytes);
  if (!size) throw badRequest('A skin is a PNG image');
  if (!isSkinSize(size)) throw badRequest(`A skin is 64×64 or 64×32 pixels, not ${size.width}×${size.height}`);
  const hash = await sha256Hex(bytes.buffer as ArrayBuffer);
  await c.env.TEXTURES.put(key(userId, model.data, hash), bytes, { httpMetadata: { contentType: 'image/png' } });
  await wear(c.env, userId, model.data, hash);
  announce(c, userId, 'wear');
  return c.json(skin(c.env, userId, model.data, hash) satisfies Skin);
});

/** Wears a skin uploaded before, in either model. */
app.post(`${PATH}/me/select`, async c => {
  const userId = c.get('userId');
  const { hash, model } = await parse(c.req.raw, SelectSkinSchema);
  if (!(await c.env.TEXTURES.head(key(userId, model, hash)))) {
    const other = model === 'slim' ? 'classic' : 'slim';
    const source = await c.env.TEXTURES.get(key(userId, other, hash));
    if (!source) throw notFound('No such skin');
    await c.env.TEXTURES.put(key(userId, model, hash), await source.arrayBuffer(), {
      httpMetadata: { contentType: 'image/png' },
    });
  }
  await wear(c.env, userId, model, hash);
  announce(c, userId, 'wear');
  return c.json(skin(c.env, userId, model, hash) satisfies Skin);
});

/** Takes the skin off; the uploads stay among the recent ones. */
app.delete(`${PATH}/me`, async c => {
  await c.env.DB.prepare(`delete from "skin" where "userId" = ?1`).bind(c.get('userId')).run();
  announce(c, c.get('userId'), 'reset');
  return c.body(null, 204);
});

app.onError(errorHandler);
app.notFound(notFoundHandler);

export default { fetch: app.fetch } satisfies ExportedHandler<Env>;

interface Row {
  userId: string;
  model: SkinModel;
  hash: string;
}

function key(userId: string, model: SkinModel, hash: string) {
  return `${userId}/${model}/${hash}.png`;
}

function skin(env: Env, userId: string, model: SkinModel, hash: string): Skin {
  return { model, hash, url: `${env.BASE_URL}${PATH}/textures/${key(userId, model, hash)}` };
}

async function current(env: Env, userId: string): Promise<Skin | null> {
  const row = await env.DB.prepare(`select "userId", "model", "hash" from "skin" where "userId" = ?1`)
    .bind(userId)
    .first<Row>();
  return row ? skin(env, row.userId, row.model, row.hash) : null;
}

/** Friends who are online pick the change up at once, and the account's activity notes it. */
function announce(
  c: { env: Env; req: { raw: Request }; executionCtx: { waitUntil(promise: Promise<unknown>): void } },
  userId: string,
  change: 'wear' | 'reset',
) {
  const headers = c.req.raw.headers;
  c.executionCtx.waitUntil(
    c.env.ID.skinChanged(userId, {
      change,
      ipAddress: headers.get('cf-connecting-ip'),
      userAgent: headers.get('user-agent'),
    }),
  );
}

async function wear(env: Env, userId: string, model: SkinModel, hash: string) {
  await env.DB.prepare(
    `insert into "skin" ("userId", "model", "hash", "updatedAt") values (?1, ?2, ?3, ?4)
     on conflict ("userId") do update set "model" = excluded."model", "hash" = excluded."hash", "updatedAt" = excluded."updatedAt"`,
  )
    .bind(userId, model, hash, new Date().toISOString())
    .run();
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
