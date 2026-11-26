/** An error answer from a BX Team Worker; the site shows its `code`, translated. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly params?: Record<string, string | number>,
  ) {
    super(message);
  }
}

/** Reads a Worker's error body; a body that is not ours still keeps the status. */
export async function apiError(response: Response): Promise<ApiError> {
  const body = (await response.json().catch(() => null)) as {
    code?: unknown;
    message?: unknown;
    params?: Record<string, string | number>;
  } | null;
  return new ApiError(
    response.status,
    typeof body?.code === 'string' ? body.code : '',
    typeof body?.message === 'string' ? body.message : `HTTP ${response.status}`,
    body?.params,
  );
}

/** What Worker errors, Better Auth's `{ status, code }` and failed fetches have in common. */
export interface Problem {
  status?: number;
  code?: string;
  params?: Record<string, string | number>;
}

export function problem(error: unknown): Problem {
  if (error instanceof ApiError) return error;
  if (error instanceof TypeError) return { code: 'NETWORK' };
  if (error && typeof error === 'object') {
    const e = error as { status?: unknown; code?: unknown };
    return {
      status: typeof e.status === 'number' ? e.status : undefined,
      code: typeof e.code === 'string' ? e.code : undefined,
    };
  }
  return {};
}
