import { DurableObject } from 'cloudflare:workers';
import {
  type Activity,
  ClientMessageSchema,
  type Presence,
  type ServerEvent,
  type Status,
} from '@bx-team/types/schema/play';
import { db } from '../db';
import { friendIds, friendships } from './friends';

/** A socket tagged this only listens, such as the account page: it never makes the player online. */
const WATCH = 'watch';

/** A blip in the connection should not close the host's lobby under its guests. */
const OFFLINE_GRACE_MS = 60 * 1000;

/** One per BX ID: the launcher's sockets, its presence, and the lobby it hosts. */
export class UserHub extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    // Keepalives are answered without waking the object.
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('{"type":"ping"}', '{"type":"pong"}'));
  }

  async fetch(request: Request): Promise<Response> {
    const userId = request.headers.get('X-User-Id');
    if (!userId || request.headers.get('Upgrade') !== 'websocket') return new Response(null, { status: 400 });

    await this.ctx.storage.put('userId', userId);
    const watching = new URL(request.url).searchParams.has('watch');
    const sessionId = request.headers.get('X-Session-Id');
    const wasOnline = this.sockets().length > 0;
    const [client, server] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(server, [...(watching ? [WATCH] : []), ...(sessionId ? [sessionTag(sessionId)] : [])]);
    server.send(JSON.stringify({ type: 'status', status: await this.status() } satisfies ServerEvent));
    if (!watching && !wasOnline) {
      await this.ctx.storage.deleteAlarm();
      await this.broadcast();
    }
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer) {
    const parsed = typeof raw === 'string' ? ClientMessageSchema.safeParse(safeJson(raw)) : null;
    if (!parsed?.success) {
      ws.close(1003, 'Unknown message');
      return;
    }
    const message = parsed.data;
    if (message.type === 'ping') {
      ws.send(JSON.stringify({ type: 'pong' } satisfies ServerEvent));
    } else if (this.watching(ws)) {
      ws.close(1008, 'This socket only listens');
    } else if (message.type === 'activity') {
      await this.ctx.storage.put('activity', message.activity);
      await this.broadcast();
    } else if (message.type === 'status') {
      if (message.status === 'invisible' && (await this.status()) !== 'invisible') {
        await this.ctx.storage.put('lastSeen', new Date().toISOString());
      }
      await this.ctx.storage.put('status', message.status);
      await this.deliver({ type: 'status', status: message.status });
      await this.broadcast();
    } else {
      const id = lobbyId(this.env, message.lobby);
      if (id) await this.env.LOBBY.get(id).relay(await this.userId(), message.to, message.data);
    }
  }

  async webSocketClose(ws: WebSocket) {
    if (this.watching(ws) || this.sockets(ws).length > 0) return;
    await this.ctx.storage.delete('activity');
    if ((await this.status()) !== 'invisible') await this.ctx.storage.put('lastSeen', new Date().toISOString());
    await this.broadcast(ws);
    if (await this.ctx.storage.get('hosting')) await this.ctx.storage.setAlarm(Date.now() + OFFLINE_GRACE_MS);
  }

  async webSocketError(ws: WebSocket) {
    await this.webSocketClose(ws);
  }

  async alarm() {
    if (this.sockets().length > 0) return;
    const hosting = await this.ctx.storage.get<string>('hosting');
    if (!hosting) return;
    await this.ctx.storage.delete('hosting');
    await this.env.LOBBY.get(this.env.LOBBY.idFromString(hosting)).close(await this.userId());
  }

  /** What friends see; an invisible player looks offline since they went invisible. */
  async presence(closing?: WebSocket): Promise<Presence> {
    const status = await this.status();
    if (this.sockets(closing).length === 0 || status === 'invisible') {
      return { online: false, activity: null, lastSeen: (await this.ctx.storage.get<string>('lastSeen')) ?? null };
    }
    const activity = (await this.ctx.storage.get<Activity>('activity')) ?? null;
    return { online: true, activity, ...(status === 'busy' ? { status } : {}) };
  }

  /** Dropped when no launcher or account page of this account is open. */
  async deliver(event: ServerEvent) {
    const data = JSON.stringify(event);
    for (const ws of this.ctx.getWebSockets()) if (ws.readyState === WebSocket.OPEN) ws.send(data);
  }

  /** The lobby this account hosts; a new one replaces it. Returns the one it replaced. */
  async setHosting(userId: string, lobby: string | null): Promise<string | null> {
    await this.ctx.storage.put('userId', userId);
    const previous = (await this.ctx.storage.get<string>('hosting')) ?? null;
    if (lobby) await this.ctx.storage.put('hosting', lobby);
    else await this.ctx.storage.delete('hosting');
    return previous;
  }

  /** Closes the sockets of sessions that just ended, so their launcher finds out at once rather than on its next request. */
  async endSessions(sessionIds: string[]) {
    const tags = new Set(sessionIds.map(sessionTag));
    for (const ws of this.ctx.getWebSockets()) {
      if (this.ctx.getTags(ws).some(tag => tags.has(tag))) ws.close(4001, 'Signed out');
    }
  }

  /** The app was disconnected: its launchers are closed, its world shut and its presence forgotten. */
  async reset() {
    const hosting = await this.ctx.storage.get<string>('hosting');
    const userId = await this.ctx.storage.get<string>('userId');
    if (hosting && userId) await this.env.LOBBY.get(this.env.LOBBY.idFromString(hosting)).close(userId);
    for (const ws of this.sockets()) ws.close(4001, 'The app was disconnected from this BX ID');
    await this.ctx.storage.deleteAlarm();
    await this.ctx.storage.deleteAll();
    if (userId) await this.ctx.storage.put('userId', userId);
  }

  private async status(): Promise<Status> {
    return (await this.ctx.storage.get<Status>('status')) ?? 'online';
  }

  /** The launchers' sockets, which make the player online; listeners are left out. */
  private sockets(except?: WebSocket) {
    return this.ctx
      .getWebSockets()
      .filter(ws => ws !== except && ws.readyState === WebSocket.OPEN && !this.watching(ws));
  }

  private watching(ws: WebSocket) {
    return this.ctx.getTags(ws).includes(WATCH);
  }

  private async userId() {
    const id = await this.ctx.storage.get<string>('userId');
    if (!id) throw new Error('UserHub used before its first connection');
    return id;
  }

  private async broadcast(closing?: WebSocket) {
    const userId = await this.ctx.storage.get<string>('userId');
    if (!userId) return;
    const event: ServerEvent = { type: 'presence', userId, presence: await this.presence(closing) };
    const friends = await friendIds(db(this.env), userId);
    await Promise.allSettled(friends.map(id => this.env.HUB.get(this.env.HUB.idFromName(id)).deliver(event)));
  }
}

const sessionTag = (sessionId: string) => `session:${sessionId}`;

/** A lobby id from a client, or `null` when it is not one this namespace made. */
export function lobbyId(env: Env, raw: string) {
  try {
    return env.LOBBY.idFromString(raw);
  } catch {
    return null;
  }
}

function safeJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Drops this BX ID's friends and requests, telling each of them, and resets its presence. */
export async function forgetPlay(env: Env, userId: string) {
  const { accepted, incoming, outgoing } = await friendships(db(env), userId);
  await db(env)
    .deleteFrom('friendship')
    .where(eb => eb.or([eb('userId', '=', userId), eb('friendId', '=', userId)]))
    .execute();
  const event: ServerEvent = { type: 'friend_removed', userId };
  await Promise.allSettled(
    [...accepted, ...incoming, ...outgoing].map(id => env.HUB.get(env.HUB.idFromName(id)).deliver(event)),
  );
  await env.HUB.get(env.HUB.idFromName(userId)).reset();
}
