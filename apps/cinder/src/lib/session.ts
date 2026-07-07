import { DurableObject } from 'cloudflare:workers';
import type { Env } from '../env';
import { writeSession } from './analytics';

interface StoredSession {
  joinedAt: number;
  clientVersion: string;
  countryCode: string;
}

/** Sessions open longer than this are swept by the alarm and written as abandoned. */
const STALE_MS = 24 * 60 * 60 * 1000;

/**
 * One instance per project (`idFromName(projectId)`). Bridges player join→quit into a
 * single completed-session row written to Analytics Engine on leave, so no half-open
 * session ever reaches AE. An alarm sweeps stale sessions, writing an explicit
 * abandoned-session row before evicting instead of letting them vanish silently.
 */
export class SessionBridge extends DurableObject<Env> {
  async join(
    projectId: string,
    uuid: string,
    joinedAt: number,
    clientVersion: string,
    countryCode: string,
  ): Promise<void> {
    await this.ctx.storage.put('projectId', projectId);
    await this.ctx.storage.put(`s:${uuid}`, { joinedAt, clientVersion, countryCode } satisfies StoredSession);
    if ((await this.ctx.storage.getAlarm()) === null) {
      await this.ctx.storage.setAlarm(Date.now() + STALE_MS);
    }
  }

  async quit(projectId: string, uuid: string, leftAt: number): Promise<void> {
    const key = `s:${uuid}`;
    const meta = await this.ctx.storage.get<StoredSession>(key);
    if (!meta) return;
    await this.ctx.storage.delete(key);
    writeSession(this.env, projectId, {
      playerUuid: uuid,
      clientVersion: meta.clientVersion,
      countryCode: meta.countryCode,
      durationSeconds: Math.max(0, Math.round((leftAt - meta.joinedAt) / 1000)),
      abandoned: false,
    });
  }

  override async alarm(): Promise<void> {
    const now = Date.now();
    const projectId = (await this.ctx.storage.get<string>('projectId')) ?? '';
    const sessions = await this.ctx.storage.list<StoredSession>({ prefix: 's:' });
    let remaining = 0;

    for (const [key, meta] of sessions) {
      if (now - meta.joinedAt < STALE_MS) {
        remaining++;
        continue;
      }
      await this.ctx.storage.delete(key);
      writeSession(this.env, projectId, {
        playerUuid: key.slice(2),
        clientVersion: meta.clientVersion,
        countryCode: meta.countryCode,
        durationSeconds: Math.round((now - meta.joinedAt) / 1000),
        abandoned: true,
      });
    }

    if (remaining > 0) await this.ctx.storage.setAlarm(now + STALE_MS);
  }
}
