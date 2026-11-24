import { WorkerEntrypoint } from 'cloudflare:workers';
import { createAuth } from './auth';
import type { Env } from './env';
import { record } from './events';
import { friendIds } from './play/friends';

/** What other BX Team Workers may ask BX ID through a service binding; nothing private leaves it. */
export class IdService extends WorkerEntrypoint<Env> {
  /** The BX ID signed in by a request's `Cookie` (the site) or `Authorization` (an app), if any. */
  async userId(credentials: { cookie?: string | null; authorization?: string | null }): Promise<string | null> {
    const headers = new Headers();
    if (credentials.cookie) headers.set('cookie', credentials.cookie);
    if (credentials.authorization) headers.set('authorization', credentials.authorization);
    const session = await createAuth(this.env, this.ctx as never).api.getSession({ headers });
    return session?.user.id ?? null;
  }

  /** Tells the player's own launchers and their friends' that the player's skin changed, and logs it. */
  async skinChanged(
    userId: string,
    from: { change: 'wear' | 'reset'; ipAddress: string | null; userAgent: string | null },
  ): Promise<void> {
    await record(this.env.DB, userId, {
      kind: 'skin',
      detail: { change: from.change },
      ipAddress: from.ipAddress,
      userAgent: from.userAgent,
    });
    const everyone = [userId, ...(await friendIds(this.env.DB, userId))];
    await Promise.all(
      everyone.map(id => this.env.HUB.get(this.env.HUB.idFromName(id)).deliver({ type: 'skin', userId })),
    );
  }
}
