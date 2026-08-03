import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

/** The single error shape every route group answers with. */
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
export const notFound = (message: string) => new ApiError(404, 'Not Found', message);
export const conflict = (message: string) => new ApiError(409, 'Conflict', message);
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
