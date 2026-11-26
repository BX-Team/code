import { createMiddleware } from 'hono/factory';

const CACHE_CONTROL = 'public, max-age=60, stale-while-revalidate=60';

// Worker responses are never cached implicitly; the Cache API is a no-op on *.workers.dev. `no-cache` bypasses it for the bot.
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
    // The default suits lists a publish purges, not lookups nothing invalidates, so a handler's own wins.
    if (!c.res.headers.has('Cache-Control')) c.res.headers.set('Cache-Control', CACHE_CONTROL);
    c.executionCtx.waitUntil(cache.put(c.req.raw, c.res.clone()));
  }
});

/** Only exact URLs can be deleted, so pages of builds past the first stay up to `max-age` stale. */
export function purge(origin: string, paths: string[]): Promise<unknown> {
  return Promise.all(paths.map(path => caches.default.delete(new Request(new URL(path, origin))))).catch(error =>
    console.error('Failed to purge cache', error),
  );
}
