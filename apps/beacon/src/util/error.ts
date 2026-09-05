import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

/** The single error shape beacon answers with. */
export class BeaconError extends Error {
  constructor(
    readonly status: ContentfulStatusCode,
    readonly title: string,
    message: string,
  ) {
    super(message);
  }
}

export const badRequest = (message: string) => new BeaconError(400, 'Bad Request', message);
export const unauthorized = () => new BeaconError(401, 'Unauthorized', 'Unauthorized');

export function errorHandler(err: Error, c: Context) {
  if (err instanceof BeaconError) {
    return c.json({ ok: false, error: err.title, message: err.message }, err.status);
  }

  console.error(err);
  return c.json({ ok: false, error: 'Internal Server Error', message: 'Unexpected error' }, 500);
}

export function notFoundHandler(c: Context) {
  return c.json({ ok: false, error: 'Not Found', message: `No route for ${c.req.method} ${c.req.path}` }, 404);
}
