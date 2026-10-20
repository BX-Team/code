import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

/** The single error shape every Worker answers with: `{ ok: false, error, message }`. */
export class HttpError extends Error {
  constructor(
    readonly status: ContentfulStatusCode,
    readonly title: string,
    message: string,
  ) {
    super(message);
  }
}

export const badRequest = (message: string) => new HttpError(400, 'Bad Request', message);
export const unauthorized = () => new HttpError(401, 'Unauthorized', 'Unauthorized');
export const forbidden = (message: string) => new HttpError(403, 'Forbidden', message);
export const notFound = (message: string) => new HttpError(404, 'Not Found', message);
export const payloadTooLarge = (message: string) => new HttpError(413, 'Payload Too Large', message);
export const internal = (message: string) => new HttpError(500, 'Internal Server Error', message);

export function errorHandler(err: Error, c: Context) {
  if (err instanceof HttpError) {
    return c.json({ ok: false, error: err.title, message: err.message }, err.status);
  }

  console.error(err);
  return c.json({ ok: false, error: 'Internal Server Error', message: 'Unexpected error' }, 500);
}

export function notFoundHandler(c: Context) {
  return c.json({ ok: false, error: 'Not Found', message: `No route for ${c.req.method} ${c.req.path}` }, 404);
}
