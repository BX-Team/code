import { WorkerEntrypoint } from 'cloudflare:workers';
import { createAuth } from './auth';
import type { Env } from './env';
import { record } from './events';

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

  /** Logs a nick or skin change and tells the player's own launchers; friends see the BX ID picture, not skins. */
  async profilesChanged(
    userId: string,
    event: {
      kind: 'nick-added' | 'nick-removed' | 'skin';
      detail: Record<string, string>;
      ipAddress: string | null;
      userAgent: string | null;
    },
  ): Promise<void> {
    await record(this.env, userId, event);
    await this.env.HUB.get(this.env.HUB.idFromName(userId)).deliver({ type: 'skin', userId });
  }
}
