import { badRequest } from '@bx-team/worker/error';
import { OpenAPIHono } from '@hono/zod-openapi';
import type { AppEnv } from './context';

/**
 * A route group whose validation failures throw into `app.onError` like every other
 * error, so a bad parameter answers with the same `{ ok, error, message }` shape.
 */
export function router() {
  return new OpenAPIHono<AppEnv>({
    defaultHook: result => {
      if (!result.success) throw badRequest(result.error.issues.map(issue => issue.message).join('; '));
    },
  });
}
