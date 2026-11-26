import { WorkerEntrypoint } from 'cloudflare:workers';
import type { BxIdProduct } from '@bx-team/worker/bxid';
import { db } from './app';

/** Skins as a BX ID product: BX ID's `PRODUCT_SKINS` binding. */
export class SkinsService extends WorkerEntrypoint<Env> implements BxIdProduct {
  /** Drops everything kept for a deleted BX ID: its nicks, held ones too, so they are free at once, and every PNG. */
  async forget(userId: string): Promise<void> {
    await db(this.env).deleteFrom('profile').where('userId', '=', userId).execute();
    let cursor: string | undefined;
    do {
      const listed = await this.env.TEXTURES.list({ prefix: `${userId}/`, cursor });
      if (listed.objects.length) await this.env.TEXTURES.delete(listed.objects.map(object => object.key));
      cursor = listed.truncated ? listed.cursor : undefined;
    } while (cursor);
  }
}
