import { WorkerEntrypoint } from 'cloudflare:workers';
import type { Env } from './env';

/** What BX ID asks of skins through a service binding. */
export class SkinsService extends WorkerEntrypoint<Env> {
  /** Drops everything kept for a deleted BX ID: its nicks, held ones too, so they are free at once, and every PNG. */
  async forget(userId: string): Promise<void> {
    await this.env.DB.prepare(`delete from "profile" where "userId" = ?1`).bind(userId).run();
    let cursor: string | undefined;
    do {
      const listed = await this.env.TEXTURES.list({ prefix: `${userId}/`, cursor });
      if (listed.objects.length) await this.env.TEXTURES.delete(listed.objects.map(object => object.key));
      cursor = listed.truncated ? listed.cursor : undefined;
    } while (cursor);
  }
}
