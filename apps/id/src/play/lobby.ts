import { DurableObject } from 'cloudflare:workers';
import type { Lobby as LobbyState, ServerEvent } from '@bx-team/types/schema/play';

/** A lobby nobody closed is gone after a day; the host's launcher opens a new one per session. */
const LIFETIME_MS = 24 * 60 * 60 * 1000;

type Input = Pick<LobbyState, 'name' | 'game'> & { open?: boolean };

/** An error class does not survive RPC, so refusals come back as values for the Worker to throw. */
export type Outcome<T> = { ok: true; value: T } | { ok: false; status: 400 | 403 | 404; message: string };

const ok = <T>(value: T): Outcome<T> => ({ ok: true, value });
const fail = (status: 400 | 403 | 404, message: string): Outcome<never> => ({ ok: false, status, message });
const missing = fail(404, 'No such lobby');

/** One per lobby: who is in it, who was asked, and the WebRTC signalling between them. */
export class Lobby extends DurableObject<Env> {
  async create(host: string, input: Input): Promise<LobbyState> {
    const lobby: LobbyState = {
      id: this.ctx.id.toString(),
      name: input.name,
      game: input.game,
      host,
      members: [host],
      invited: [],
      open: input.open ?? false,
      createdAt: new Date().toISOString(),
    };
    await this.ctx.storage.put('lobby', lobby);
    await this.ctx.storage.setAlarm(Date.now() + LIFETIME_MS);
    return lobby;
  }

  /** The lobby as `userId` may see it: only members and invited players see anything. */
  async view(userId: string): Promise<Outcome<LobbyState>> {
    const lobby = await this.state();
    if (!lobby || (!lobby.members.includes(userId) && !lobby.invited.includes(userId))) return missing;
    return ok(lobby);
  }

  async invite(by: string, userId: string): Promise<Outcome<LobbyState>> {
    const lobby = await this.state();
    if (!lobby?.members.includes(by)) return missing;
    if (lobby.host !== by) return fail(403, 'Only the host invites');
    if (lobby.members.includes(userId)) return ok(lobby);
    if (!lobby.invited.includes(userId)) lobby.invited.push(userId);
    await this.ctx.storage.put('lobby', lobby);
    return ok(lobby);
  }

  /** Who hosts and whether friends may walk in, so the Worker can check the friendship first. */
  async door(): Promise<{ host: string; open: boolean } | null> {
    const lobby = await this.state();
    return lobby ? { host: lobby.host, open: lobby.open } : null;
  }

  /** `friend` is the Worker's word that `userId` is the host's friend, which opens an open lobby. */
  async join(userId: string, friend: boolean, size: number): Promise<Outcome<LobbyState>> {
    const lobby = await this.state();
    if (!lobby) return missing;
    if (lobby.members.includes(userId)) return ok(lobby);
    if (!lobby.invited.includes(userId) && !(lobby.open && friend)) return missing;
    if (lobby.members.length >= size) return fail(400, 'The lobby is full');
    lobby.invited = lobby.invited.filter(id => id !== userId);
    lobby.members.push(userId);
    await this.ctx.storage.put('lobby', lobby);
    await this.notify(lobby.members, { type: 'lobby', lobby });
    return ok(lobby);
  }

  /** Leaving as the host closes the lobby for everyone. */
  async leave(userId: string): Promise<Outcome<null>> {
    const lobby = await this.state();
    if (!lobby || (!lobby.members.includes(userId) && !lobby.invited.includes(userId))) return missing;
    if (lobby.host === userId) return this.close(userId);
    lobby.members = lobby.members.filter(id => id !== userId);
    lobby.invited = lobby.invited.filter(id => id !== userId);
    await this.ctx.storage.put('lobby', lobby);
    await this.notify([...lobby.members, userId], { type: 'lobby', lobby });
    return ok(null);
  }

  async setOpen(by: string, open: boolean): Promise<Outcome<LobbyState>> {
    const lobby = await this.state();
    if (!lobby?.members.includes(by)) return missing;
    if (lobby.host !== by) return fail(403, 'Only the host opens the lobby');
    lobby.open = open;
    await this.ctx.storage.put('lobby', lobby);
    await this.notify(lobby.members, { type: 'lobby', lobby });
    return ok(lobby);
  }

  async close(by: string): Promise<Outcome<null>> {
    const lobby = await this.state();
    if (!lobby) return ok(null);
    if (lobby.host !== by) return fail(403, 'Only the host closes the lobby');
    await this.shutdown(lobby);
    return ok(null);
  }

  /** Passes a WebRTC message between two members; anything else is dropped, not answered. */
  async relay(from: string, to: string, data: unknown) {
    const lobby = await this.state();
    if (!lobby?.members.includes(from) || !lobby.members.includes(to) || from === to) return;
    await this.notify([to], { type: 'signal', lobby: lobby.id, from, data });
  }

  async alarm() {
    const lobby = await this.state();
    if (lobby) await this.shutdown(lobby);
  }

  private async shutdown(lobby: LobbyState) {
    await this.ctx.storage.deleteAll();
    await this.notify([...lobby.members, ...lobby.invited], { type: 'lobby_closed', lobby: lobby.id });
  }

  private state() {
    return this.ctx.storage.get<LobbyState>('lobby');
  }

  private async notify(users: string[], event: ServerEvent) {
    await Promise.allSettled(users.map(id => this.env.HUB.get(this.env.HUB.idFromName(id)).deliver(event)));
  }
}
