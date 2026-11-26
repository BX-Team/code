import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

export type ErrorParams = Record<string, string | number>;

/** The error every Worker answers with; clients translate `code`, `message` is English for logs and API users. */
export class HttpError extends Error {
  constructor(
    readonly status: ContentfulStatusCode,
    readonly title: string,
    message: string,
    readonly code: string = title.toUpperCase().replaceAll(' ', '_'),
    readonly params?: ErrorParams,
  ) {
    super(message);
  }
}

export const badRequest = (message: string, code?: string, params?: ErrorParams) =>
  new HttpError(400, 'Bad Request', message, code, params);
export const unauthorized = () => new HttpError(401, 'Unauthorized', 'Unauthorized');
export const forbidden = (message: string, code?: string, params?: ErrorParams) =>
  new HttpError(403, 'Forbidden', message, code, params);
export const notFound = (message: string, code?: string, params?: ErrorParams) =>
  new HttpError(404, 'Not Found', message, code, params);
export const conflict = (message: string, code?: string, params?: ErrorParams) =>
  new HttpError(409, 'Conflict', message, code, params);
export const payloadTooLarge = (message: string, code?: string, params?: ErrorParams) =>
  new HttpError(413, 'Payload Too Large', message, code, params);
export const internal = (message: string) => new HttpError(500, 'Internal Server Error', message);
export const unavailable = (message: string, code?: string, params?: ErrorParams) =>
  new HttpError(503, 'Service Unavailable', message, code, params);

export function errorHandler(err: Error, c: Context) {
  if (err instanceof HttpError) {
    return c.json(
      {
        ok: false,
        error: err.title,
        code: err.code,
        message: err.message,
        ...(err.params ? { params: err.params } : {}),
      },
      err.status,
    );
  }

  console.error(err);
  return c.json(
    { ok: false, error: 'Internal Server Error', code: 'INTERNAL_SERVER_ERROR', message: 'Unexpected error' },
    500,
  );
}

export function notFoundHandler(c: Context) {
  return c.json(
    { ok: false, error: 'Not Found', code: 'NOT_FOUND', message: `No route for ${c.req.method} ${c.req.path}` },
    404,
  );
}
