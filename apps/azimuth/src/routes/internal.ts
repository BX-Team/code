import type { IncomingRequestCfProperties } from '@cloudflare/workers-types';
import { Scalar } from '@scalar/hono-api-reference';
import { Hono } from 'hono';
import type { Env } from '../env';
import { openApiDocument } from '../openapi';

export const internal = new Hono<{ Bindings: Env }>();

internal.get('/health', c => c.json({ status: 'ok' }));

// Reports the Cloudflare edge location that served the request, so the frontend
// can show where a visitor is being routed.
internal.get('/location', c => {
  const cf = (c.req.raw as unknown as { cf?: IncomingRequestCfProperties }).cf;
  return c.json({
    colo: cf?.colo ?? null,
    city: cf?.city ?? null,
    country: cf?.country ?? null,
  });
});

internal.get('/openapi.json', c => c.json(openApiDocument(new URL(c.req.url).origin)));

internal.get(
  '/reference',
  Scalar({ url: '/openapi.json', pageTitle: 'BX Team API Reference', theme: 'default', darkMode: true }),
);
