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
import { list, valid } from '@bx-team/worker/http';
import { Hono } from 'hono';
import { db } from '../db';
import { normalizeFriendCode } from '../friend-code';
import { type Bindings, signedIn } from '../session';
import { findByFriendCode, profiles } from '../users';
import { accept, areFriends, friendships, MAX_FRIENDS, remove, request } from './friends';
import { lobbyId } from './hub';
import { iceServers } from './ice';
import type { Outcome } from './lobby';

export const PLAY_PATH = '/v1/play';

export const play = new Hono<Bindings>();

play.use(signedIn);

play.get('/ice', async c => c.json(await iceServers(c.env)));

play.get('/connect', async c => {
  if (c.req.header('Upgrade') !== 'websocket') throw badRequest('Expected a WebSocket upgrade');
  // A browser sends the cookie with a WebSocket from any page; CORS does not cover the upgrade.
  const origin = c.req.header('Origin');
  if (origin && !list(c.env.TRUSTED_ORIGINS).includes(origin)) throw forbidden('This origin may not connect');
  const forwarded = new Request(c.req.raw);
  forwarded.headers.set('X-User-Id', c.get('userId'));
  forwarded.headers.set('X-Session-Id', c.get('sessionId'));
  return hub(c.env, c.get('userId')).fetch(forwarded);
});

play.get('/friends', async c => {
  const userId = c.get('userId');
  const { accepted, incoming, outgoing } = await friendships(db(c.env), userId);
  const users = byId(await profiles(db(c.env), [...accepted, ...incoming, ...outgoing]));
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

play.post('/friends', valid('json', FriendRequestSchema), async c => {
  const { code } = c.req.valid('json');
  const userId = c.get('userId');
  const target = await findByFriendCode(db(c.env), normalizeFriendCode(code));
  if (!target || target.id === userId) throw notFound('No one has that friend code', 'FRIEND_CODE_UNKNOWN');

  const mine = await friendships(db(c.env), userId);
  if (mine.accepted.length >= MAX_FRIENDS)
    throw badRequest(`A BX ID has at most ${MAX_FRIENDS} friends`, 'FRIEND_LIMIT', { max: MAX_FRIENDS });
  if (mine.outgoing.length >= (await limit(c.env.FLAGS, 'pending-friend-requests')))
    throw badRequest('Too many requests are waiting for an answer', 'FRIEND_REQUESTS_PENDING');

  const outcome = await request(db(c.env), userId, target.id);
  const [me] = await profiles(db(c.env), [userId]);
  if (me && outcome === 'requested') await deliver(c.env, target.id, { type: 'friend_request', user: me });
  if (me && outcome === 'accepted') await befriended(c.env, me, target);
  return c.json({ status: outcome, user: target } satisfies FriendAdded);
});

play.post('/friends/:id/accept', async c => {
  const userId = c.get('userId');
  const from = c.req.param('id');
  if (!(await accept(db(c.env), userId, from))) throw notFound('No such friend request', 'FRIEND_REQUEST_UNKNOWN');
  const users = byId(await profiles(db(c.env), [userId, from]));
  const me = users.get(userId);
  const them = users.get(from);
  if (me && them) await befriended(c.env, me, them);
  return c.body(null, 204);
});

play.delete('/friends/:id', async c => {
  const userId = c.get('userId');
  const other = c.req.param('id');
  if (!(await remove(db(c.env), userId, other))) throw notFound('No such friend', 'FRIEND_UNKNOWN');
  await deliver(c.env, other, { type: 'friend_removed', userId });
  return c.body(null, 204);
});

play.post('/lobbies', valid('json', CreateLobbySchema), async c => {
  const input = c.req.valid('json');
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

play.post('/lobbies/:id/invite', valid('json', InviteSchema), async c => {
  const userId = c.get('userId');
  const { userId: invitee } = c.req.valid('json');
  if (!(await areFriends(db(c.env), userId, invitee)))
    throw badRequest('Only friends can be invited', 'INVITE_NOT_FRIEND');
  const value = unwrap(await lobby(c.env, c.req.param('id')).invite(userId, invitee));
  const [from] = await profiles(db(c.env), [userId]);
  if (from) await deliver(c.env, invitee, { type: 'invite', lobby: value, from });
  return c.json(value);
});

play.post('/lobbies/:id/join', async c => {
  const userId = c.get('userId');
  const stub = lobby(c.env, c.req.param('id'));
  const door = await stub.door();
  const walkIn = !!door?.open && (await isOn(c.env.FLAGS, 'open-lobbies'));
  const friend = walkIn && !!door && (await areFriends(db(c.env), door.host, userId));
  return c.json(unwrap(await stub.join(userId, friend, await limit(c.env.FLAGS, 'lobby-size'))));
});

play.post('/lobbies/:id/open', valid('json', LobbyOpenSchema), async c => {
  const { open } = c.req.valid('json');
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
    throw forbidden('Worlds open to all friends are off for now; invite them', 'OPEN_LOBBIES_OFF');
}

function hub(env: Env, userId: string) {
  return env.HUB.get(env.HUB.idFromName(userId));
}

function lobby(env: Env, raw: string) {
  const id = lobbyId(env, raw);
  if (!id) throw notFound('No such lobby', 'LOBBY_UNKNOWN');
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
