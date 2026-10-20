import type { IncomingRequestCfProperties } from '@cloudflare/workers-types';
import { Hono } from 'hono';
import type { AppEnv } from '../context';

export const internalRoutes = new Hono<AppEnv>();

internalRoutes.get('/health', c => c.json({ status: 'ok' }));

// Reports the Cloudflare edge location that served the request, so the frontend can show
// where a visitor is being routed.
internalRoutes.get('/location', c => {
  const cf = (c.req.raw as unknown as { cf?: IncomingRequestCfProperties }).cf;
  return c.json({ colo: cf?.colo ?? null, city: cf?.city ?? null, country: cf?.country ?? null });
});
