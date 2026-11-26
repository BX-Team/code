import { BannerSchema, type Notice } from '@bx-team/types/schema/bxid';
import { bannerFlag } from '@bx-team/worker/flags';
import { Hono } from 'hono';

/** What the site shows everyone above its pages, such as "sign-in is down"; no session needed. */
export const notice = new Hono<{ Bindings: Env }>();

notice.get('/', async c => {
  const banner = BannerSchema.safeParse(await bannerFlag(c.env.FLAGS));
  c.header('Cache-Control', 'public, max-age=60');
  return c.json({ banner: banner.success ? banner.data : null } satisfies Notice);
});
