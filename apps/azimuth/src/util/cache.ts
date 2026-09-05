import { createMiddleware } from 'hono/factory';

const CACHE_CONTROL = 'public, max-age=60, stale-while-revalidate=60';

/**
 * Edge-caches successful GET responses in Cloudflare's HTTP cache. Worker responses are
 * never cached implicitly, so this goes through the Cache API: match on the full request
 * URL, and on a miss store the response with a Cache-Control header via waitUntil. The
 * Cache API is a no-op on *.workers.dev — real HITs need a custom domain.
 *
 * `Cache-Control: no-cache` on the request bypasses it, which is how beacon reads a
 * publish back the instant it is told about one.
 */
export const edgeCache = createMiddleware(async (c, next) => {
  if (c.req.method !== 'GET' || c.req.header('Cache-Control')?.includes('no-cache')) {
    await next();
    return;
  }

  const cache = caches.default;
  const cached = await cache.match(c.req.raw);
  if (cached) return cached;

  await next();

  if (c.res.status === 200) {
    c.res.headers.set('Cache-Control', CACHE_CONTROL);
    c.executionCtx.waitUntil(cache.put(c.req.raw, c.res.clone()));
  }
});

/**
 * Drops the cached copies a publish invalidated. Only exact URLs can be deleted, so a
 * page of builds past the first one stays up to `max-age` stale — the pages the site and
 * the bot actually open are listed here.
 */
export function purge(origin: string, paths: string[]): Promise<unknown> {
  return Promise.all(paths.map(path => caches.default.delete(new Request(new URL(path, origin))))).catch(error =>
    console.error('Failed to purge cache', error),
  );
}
