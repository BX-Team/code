import type { IncomingRequestCfProperties } from '@cloudflare/workers-types';
import { Scalar } from '@scalar/hono-api-reference';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createMiddleware } from 'hono/factory';
import type { Env } from './env';
import { buildAuth } from './lib/auth';
import { openApiDocument } from './lib/openapi';
import { requireAuth, type SessionVariables } from './middleware/auth';
import { atlas } from './routes/atlas';
import { pulsify } from './routes/pulsify';

const app = new Hono<{ Bindings: Env; Variables: SessionVariables }>();

/** Credentialed CORS for the browser-facing groups, restricted to TRUSTED_ORIGINS. */
const trustedCors = createMiddleware<{ Bindings: Env }>((c, next) =>
  cors({
    origin: origin => {
      const allowed = (c.env.TRUSTED_ORIGINS ?? '')
        .split(',')
        .map(o => o.trim())
        .filter(Boolean);
      return allowed.includes(origin) ? origin : (allowed[0] ?? null);
    },
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  })(c, next),
);

app.use('/auth/*', trustedCors);
app.use('/pulsify/*', trustedCors);

// Registered before the Better Auth catch-all so it wins for GET /auth/me.
app.get('/auth/me', requireAuth, c => c.json({ user: c.get('authSession')?.user ?? null }));

app.on(['GET', 'POST'], '/auth/*', c => buildAuth(c.env).handler(c.req.raw));

// Atlas is a public downloads API: credential-less CORS for browser reads from
// the static meridian frontend; writes are bearer-secret CI calls.
app.use('/atlas/*', cors({ allowHeaders: ['Content-Type', 'Authorization'] }));
app.route('/atlas', atlas);

app.route('/pulsify', pulsify);

// Reports the Cloudflare edge location that served the request, so the frontend
// can show where a visitor is being routed. Public and unauthenticated.
app.use('/location', cors());
app.get('/location', c => {
  const cf = (c.req.raw as unknown as { cf?: IncomingRequestCfProperties }).cf;
  return c.json({
    colo: cf?.colo ?? null,
    city: cf?.city ?? null,
    country: cf?.country ?? null,
  });
});

// Public API reference: the OpenAPI document plus a Scalar-rendered browser UI.
app.use('/openapi.json', cors());
app.get('/openapi.json', c => c.json(openApiDocument(new URL(c.req.url).origin)));
app.get('/reference', Scalar({ url: '/openapi.json', pageTitle: 'BX Team API Reference', theme: 'default' }));

app.get('/health', c => c.json({ status: 'ok' }));

export default {
  fetch: app.fetch,
} satisfies ExportedHandler<Env>;
