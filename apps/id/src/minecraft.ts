import { MinecraftLinkSchema, type MinecraftProfile } from '@bx-team/types/schema/bxid';
import { SessionProfileSchema } from '@bx-team/types/schema/mojang';
import { badRequest, forbidden, HttpError, internal, notFound } from '@bx-team/worker/error';
import { sign } from '@bx-team/worker/signature';
import type { D1Database } from '@cloudflare/workers-types';
import { Hono } from 'hono';
import type { Env } from './env';
import { origin, record } from './events';
import { signedIn, type Vars } from './session';

/** How long a challenge stays valid; Mojang itself forgets a `join` after about 30 seconds. */
const WINDOW_MS = 2 * 60 * 1000;

/** Linking a Minecraft profile: the launcher calls Mojang's `join` with our `serverId`, we ask `hasJoined`. */
export const minecraft = new Hono<{ Bindings: Env; Variables: Vars }>()
  .use(signedIn)
  .get('/', async c => c.json({ profiles: await linkedProfiles(c.env.DB, c.get('userId')) }))
  .post('/challenge', async c => {
    const window = Math.floor(Date.now() / WINDOW_MS);
    return c.json({ serverId: await serverId(c.env, c.get('userId'), window) });
  })
  .post('/link', async c => {
    const body = MinecraftLinkSchema.safeParse(await c.req.json().catch(() => null));
    if (!body.success) throw badRequest(body.error.message);
    const userId = c.get('userId');
    const { name, serverId: claimed } = body.data;

    // The previous window too, so a challenge issued just before a boundary still works.
    const window = Math.floor(Date.now() / WINDOW_MS);
    const issued = [await serverId(c.env, userId, window), await serverId(c.env, userId, window - 1)];
    if (!issued.includes(claimed)) throw badRequest('The challenge has expired; ask for a new one');

    const profile = await hasJoined(c.env, name, claimed);
    if (!profile) throw forbidden('Mojang has no join for this profile and challenge');

    const now = new Date().toISOString();
    const owner = await c.env.DB.prepare(
      `insert into "minecraftProfile" ("id", "userId", "name", "createdAt", "updatedAt") values (?1, ?2, ?3, ?4, ?4)
       on conflict ("id") do update set "name" = excluded."name", "updatedAt" = excluded."updatedAt"
       where "minecraftProfile"."userId" = excluded."userId"
       returning "userId"`,
    )
      .bind(profile.id, userId, profile.name, now)
      .first<{ userId: string }>();
    if (!owner) throw new HttpError(409, 'Conflict', 'This Minecraft profile is linked to another BX ID');
    await record(c.env.DB, userId, {
      kind: 'minecraft-linked',
      detail: { name: profile.name },
      ...origin(c.req.raw.headers),
    });

    return c.json(profile satisfies MinecraftProfile);
  })
  .delete('/:id', async c => {
    const gone = await c.env.DB.prepare(
      `delete from "minecraftProfile" where "id" = ?1 and "userId" = ?2 returning "name"`,
    )
      .bind(c.req.param('id'), c.get('userId'))
      .first<{ name: string }>();
    if (!gone) throw notFound('No such linked profile');
    await record(c.env.DB, c.get('userId'), {
      kind: 'minecraft-unlinked',
      detail: { name: gone.name },
      ...origin(c.req.raw.headers),
    });
    return c.body(null, 204);
  });

async function linkedProfiles(db: D1Database, userId: string): Promise<MinecraftProfile[]> {
  const { results } = await db
    .prepare(`select "id", "name" from "minecraftProfile" where "userId" = ?1 order by "createdAt"`)
    .bind(userId)
    .all<MinecraftProfile>();
  return results;
}

/** Stateless: the `serverId` is a MAC of the account and the time window, so nothing is stored. */
async function serverId(env: Env, userId: string, window: number) {
  const mac = await sign(env.BETTER_AUTH_SECRET, `minecraft-link:${userId}:${window}`);
  return mac.slice('sha256='.length, 'sha256='.length + 40);
}

async function hasJoined(env: Env, name: string, serverId: string): Promise<MinecraftProfile | null> {
  const url = new URL('/session/minecraft/hasJoined', env.MOJANG_PROXY_URL);
  url.search = new URLSearchParams({ username: name, serverId }).toString();
  const response = await fetch(url, { headers: { 'X-Proxy-Key': env.MOJANG_PROXY_KEY } }).catch(() => {
    throw internal(`Cannot reach Mojang's session server through ${url.host}`);
  });
  if (response.status === 204) return null;
  if (!response.ok) throw internal(`Mojang's session server answered ${response.status}`);

  const profile = SessionProfileSchema.safeParse(await response.json());
  if (!profile.success) throw internal("Mojang's session server sent an unexpected profile");
  return { id: profile.data.id.toLowerCase(), name: profile.data.name };
}
