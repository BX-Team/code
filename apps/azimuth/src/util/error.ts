import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

/** The single error shape every route answers with. */
export class ApiError extends Error {
  constructor(
    readonly status: ContentfulStatusCode,
    readonly title: string,
    message: string,
  ) {
    super(message);
  }
}

export const badRequest = (message: string) => new ApiError(400, 'Bad Request', message);
export const unauthorized = () => new ApiError(401, 'Unauthorized', 'Unauthorized');
export const forbidden = (message: string) => new ApiError(403, 'Forbidden', message);
export const notFound = (message: string) => new ApiError(404, 'Not Found', message);
export const payloadTooLarge = (message: string) => new ApiError(413, 'Payload Too Large', message);
export const tooManyRequests = (message: string) => new ApiError(429, 'Too Many Requests', message);
export const internal = (message: string) => new ApiError(500, 'Internal Server Error', message);

export function errorHandler(err: Error, c: Context) {
  if (err instanceof ApiError) {
    return c.json({ ok: false, error: err.title, message: err.message }, err.status);
  }

  console.error(err);
  return c.json({ ok: false, error: 'Internal Server Error', message: 'Unexpected error' }, 500);
}

export function notFoundHandler(c: Context) {
  return c.json({ ok: false, error: 'Not Found', message: `No route for ${c.req.method} ${c.req.path}` }, 404);
}
