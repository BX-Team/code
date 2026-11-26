import { badRequest } from '@bx-team/worker/error';
import { OpenAPIHono } from '@hono/zod-openapi';
import type { AppEnv } from './context';

/** Validation failures throw into `app.onError`, so a bad parameter gets the shared error shape. */
export function router() {
  return new OpenAPIHono<AppEnv>({
    defaultHook: result => {
      if (!result.success) throw badRequest(result.error.issues.map(issue => issue.message).join('; '));
    },
  });
}
