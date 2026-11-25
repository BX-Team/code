import {
  CreateLobbySchema,
  type FriendAdded,
  FriendRequestSchema,
  type Friends,
  InviteSchema,
  LobbyOpenSchema,
  type PlayUser,
  type ServerEvent,
} from '@bx-team/types/schema/play';
import { badRequest, forbidden, HttpError, notFound } from '@bx-team/worker/error';
import { isOn, limit } from '@bx-team/worker/flags';
import { Hono } from 'hono';
import type { z } from 'zod';
import { trustedOrigins } from '../auth';
import type { Env } from '../env';
import { normalizeFriendCode } from '../friend-code';
import { signedIn, type Vars } from '../session';
import { findByFriendCode, profiles } from '../users';
import { accept, areFriends, friendships, MAX_FRIENDS, remove, request } from './friends';
import { lobbyId } from './hub';
import { iceServers } from './ice';
import type { Outcome } from './lobby';

export const PLAY_PATH = '/v1/play';

export const play = new Hono<{ Bindings: Env; Variables: Vars }>();

play.use(signedIn);

play.get('/ice', async c => c.json(await iceServers(c.env)));

play.get('/connect', async c => {
  if (c.req.header('Upgrade') !== 'websocket') throw badRequest('Expected a WebSocket upgrade');
  // A browser sends the cookie with a WebSocket from any page; CORS does not cover the upgrade.
  const origin = c.req.header('Origin');
  if (origin && !trustedOrigins(c.env).includes(origin)) throw forbidden('This origin may not connect');
  const forwarded = new Request(c.req.raw);
  forwarded.headers.set('X-User-Id', c.get('userId'));
  return hub(c.env, c.get('userId')).fetch(forwarded);
});

play.get('/friends', async c => {
  const userId = c.get('userId');
  const { accepted, incoming, outgoing } = await friendships(c.env.DB, userId);
  const users = byId(await profiles(c.env.DB, [...accepted, ...incoming, ...outgoing]));
  const presences = await Promise.all(accepted.map(id => hub(c.env, id).presence()));
  const body: Friends = {
    friends: accepted.flatMap((id, i) => {
      const user = users.get(id);
      return user ? [{ user, presence: presences[i] ?? { online: false, activity: null, lastSeen: null } }] : [];
    }),
    incoming: incoming.flatMap(id => users.get(id) ?? []),
    outgoing: outgoing.flatMap(id => users.get(id) ?? []),
  };
  return c.json(body);
});

play.post('/friends', async c => {
  const { code } = await parse(c.req.raw, FriendRequestSchema);
  const userId = c.get('userId');
  const target = await findByFriendCode(c.env.DB, normalizeFriendCode(code));
  if (!target || target.id === userId) throw notFound('No one has that friend code');

  const mine = await friendships(c.env.DB, userId);
  if (mine.accepted.length >= MAX_FRIENDS) throw badRequest(`A BX ID has at most ${MAX_FRIENDS} friends`);
  if (mine.outgoing.length >= (await limit(c.env.FLAGS, 'pending-friend-requests')))
    throw badRequest('Too many requests are waiting for an answer');

  const outcome = await request(c.env.DB, userId, target.id);
  const [me] = await profiles(c.env.DB, [userId]);
  if (me && outcome === 'requested') await deliver(c.env, target.id, { type: 'friend_request', user: me });
  if (me && outcome === 'accepted') await befriended(c.env, me, target);
  return c.json({ status: outcome, user: target } satisfies FriendAdded);
});

play.post('/friends/:id/accept', async c => {
  const userId = c.get('userId');
  const from = c.req.param('id');
  if (!(await accept(c.env.DB, userId, from))) throw notFound('No such friend request');
  const users = byId(await profiles(c.env.DB, [userId, from]));
  const me = users.get(userId);
  const them = users.get(from);
  if (me && them) await befriended(c.env, me, them);
  return c.body(null, 204);
});

play.delete('/friends/:id', async c => {
  const userId = c.get('userId');
  const other = c.req.param('id');
  if (!(await remove(c.env.DB, userId, other))) throw notFound('No such friend');
  await deliver(c.env, other, { type: 'friend_removed', userId });
  return c.body(null, 204);
});

play.post('/lobbies', async c => {
  const input = await parse(c.req.raw, CreateLobbySchema);
  if (input.open) await requireOpenLobbies(c.env);
  const userId = c.get('userId');
  const stub = c.env.LOBBY.get(c.env.LOBBY.newUniqueId());
  const lobby = await stub.create(userId, input);
  const replaced = await hub(c.env, userId).setHosting(userId, lobby.id);
  const old = replaced && lobbyId(c.env, replaced);
  if (old) await c.env.LOBBY.get(old).close(userId);
  return c.json(lobby, 201);
});

play.get('/lobbies/:id', async c => c.json(unwrap(await lobby(c.env, c.req.param('id')).view(c.get('userId')))));

play.post('/lobbies/:id/invite', async c => {
  const userId = c.get('userId');
  const { userId: invitee } = await parse(c.req.raw, InviteSchema);
  if (!(await areFriends(c.env.DB, userId, invitee))) throw badRequest('Only friends can be invited');
  const value = unwrap(await lobby(c.env, c.req.param('id')).invite(userId, invitee));
  const [from] = await profiles(c.env.DB, [userId]);
  if (from) await deliver(c.env, invitee, { type: 'invite', lobby: value, from });
  return c.json(value);
});

play.post('/lobbies/:id/join', async c => {
  const userId = c.get('userId');
  const stub = lobby(c.env, c.req.param('id'));
  const door = await stub.door();
  const walkIn = !!door?.open && (await isOn(c.env.FLAGS, 'open-lobbies'));
  const friend = walkIn && !!door && (await areFriends(c.env.DB, door.host, userId));
  return c.json(unwrap(await stub.join(userId, friend, await limit(c.env.FLAGS, 'lobby-size'))));
});

play.post('/lobbies/:id/open', async c => {
  const { open } = await parse(c.req.raw, LobbyOpenSchema);
  if (open) await requireOpenLobbies(c.env);
  return c.json(unwrap(await lobby(c.env, c.req.param('id')).setOpen(c.get('userId'), open)));
});

play.post('/lobbies/:id/leave', async c => {
  unwrap(await lobby(c.env, c.req.param('id')).leave(c.get('userId')));
  return c.body(null, 204);
});

play.delete('/lobbies/:id', async c => {
  unwrap(await lobby(c.env, c.req.param('id')).close(c.get('userId')));
  return c.body(null, 204);
});

async function requireOpenLobbies(env: Env) {
  if (!(await isOn(env.FLAGS, 'open-lobbies')))
    throw forbidden('Worlds open to all friends are off for now; invite them');
}

function hub(env: Env, userId: string) {
  return env.HUB.get(env.HUB.idFromName(userId));
}

function lobby(env: Env, raw: string) {
  const id = lobbyId(env, raw);
  if (!id) throw notFound('No such lobby');
  return env.LOBBY.get(id);
}

function deliver(env: Env, userId: string, event: ServerEvent) {
  return hub(env, userId).deliver(event);
}

async function befriended(env: Env, a: PlayUser, b: PlayUser) {
  await Promise.all([
    deliver(env, a.id, { type: 'friend_added', user: b }),
    deliver(env, b.id, { type: 'friend_added', user: a }),
  ]);
}

function byId(users: PlayUser[]) {
  return new Map(users.map(user => [user.id, user]));
}

function unwrap<T>(outcome: Outcome<T>): T {
  if (outcome.ok) return outcome.value;
  throw new HttpError(
    outcome.status,
    outcome.status === 403 ? 'Forbidden' : outcome.status === 404 ? 'Not Found' : 'Bad Request',
    outcome.message,
  );
}

async function parse<T extends z.ZodType>(request: Request, schema: T): Promise<z.infer<T>> {
  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) throw badRequest(body.error.message);
  return body.data;
}
