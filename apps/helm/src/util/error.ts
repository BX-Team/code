import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

/** The single error shape helm answers with. */
export class HelmError extends Error {
  constructor(
    readonly status: ContentfulStatusCode,
    readonly title: string,
    message: string,
  ) {
    super(message);
  }
}

export const badRequest = (message: string) => new HelmError(400, 'Bad Request', message);
export const unauthorized = () => new HelmError(401, 'Unauthorized', 'Unauthorized');

/** A failure meant for the person who typed a command; it is posted back as a reply. */
export class CommandError extends Error {}

export function errorHandler(err: Error, c: Context) {
  if (err instanceof HelmError) {
    return c.json({ ok: false, error: err.title, message: err.message }, err.status);
  }

  console.error(err);
  return c.json({ ok: false, error: 'Internal Server Error', message: 'Unexpected error' }, 500);
}

export function notFoundHandler(c: Context) {
  return c.json({ ok: false, error: 'Not Found', message: `No route for ${c.req.method} ${c.req.path}` }, 404);
}
