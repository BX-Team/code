import { createMiddleware } from 'hono/factory';

const CACHE_CONTROL = 'public, max-age=300, stale-while-revalidate=60';

/**
 * Edge-caches successful GET responses in Cloudflare's HTTP cache. Worker responses are
 * never cached implicitly, so this goes through the Cache API: match on the full request
 * URL, and on a miss store the response with a Cache-Control header via waitUntil. The
 * Cache API is a no-op on *.workers.dev — real HITs need a custom domain.
 */
export const edgeCache = createMiddleware(async (c, next) => {
  if (c.req.method !== 'GET') {
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
