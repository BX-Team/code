import { health, location } from '@bx-team/types/api';
import { router } from '../router';

export const internalRoutes = router()
  .openapi(health, c => c.json({ status: 'ok' as const }, 200))
  .openapi(location, c => {
    const cf = (c.req.raw as unknown as { cf?: IncomingRequestCfProperties }).cf;
    return c.json({ colo: cf?.colo ?? null, city: cf?.city ?? null, country: cf?.country ?? null }, 200);
  });
