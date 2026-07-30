import { API_BASE } from '@/lib/api';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  role: string | null;
  banned: boolean;
  createdAt: string;
}

export interface Session {
  user: SessionUser;
}

export interface AdminUserList {
  users: SessionUser[];
  total: number;
}

interface Result<T> {
  data: T | null;
  error: { message: string } | null;
}

interface CallOptions {
  method?: string;
  body?: unknown;
  query?: Record<string, unknown>;
  headers?: Record<string, string>;
}

async function call<T>(path: string, opts: CallOptions = {}): Promise<Result<T>> {
  const url = new URL(`${API_BASE}/auth${path}`);
  for (const [key, value] of Object.entries(opts.query ?? {})) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  }

  try {
    const response = await fetch(url.toString(), {
      method: opts.method ?? 'GET',
      credentials: 'include',
      headers: {
        ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
        ...opts.headers,
      },
      ...(opts.body ? { body: JSON.stringify(opts.body) } : {}),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      return { data: null, error: { message: body?.message ?? response.statusText } };
    }

    if (response.status === 204) return { data: null as T, error: null };
    return { data: (await response.json()) as T, error: null };
  } catch (err) {
    return { data: null, error: { message: err instanceof Error ? err.message : 'Network error' } };
  }
}

/**
 * Thin client over azimuth's /auth group. It keeps the `{ data, error }` shape the pages were
 * written against, so replacing the auth backend stayed a one-file change.
 */
export const authClient = {
  getSession: (opts?: { fetchOptions?: { headers?: Record<string, string> } }) =>
    call<Session | null>('/session', { headers: opts?.fetchOptions?.headers }),

  signOut: () => call<null>('/sign-out', { method: 'POST' }),

  updateUser: (body: { name: string }) => call<Session>('/update-user', { method: 'POST', body }),

  deleteUser: () => call<null>('/delete-user', { method: 'POST' }),

  signIn: {
    magicLink: (body: { email: string; callbackURL?: string }) =>
      call<null>('/sign-in/magic-link', { method: 'POST', body }),

    // A full page navigation, not a fetch: the provider answers with its own login screen.
    social: async ({ provider, callbackURL }: { provider: string; callbackURL?: string }) => {
      const url = new URL(`${API_BASE}/auth/sign-in/${provider}`);
      if (callbackURL) url.searchParams.set('callbackURL', callbackURL);
      window.location.href = url.toString();
      return { data: null, error: null } satisfies Result<null>;
    },
  },

  admin: {
    listUsers: (opts: { query?: { limit?: number; offset?: number; searchValue?: string; filterValue?: boolean } }) =>
      call<AdminUserList>('/admin/users', { query: opts.query }),

    banUser: ({ userId, banReason }: { userId: string; banReason?: string }) =>
      call<null>(`/admin/users/${userId}/ban`, { method: 'POST', body: { banReason } }),

    unbanUser: ({ userId }: { userId: string }) => call<null>(`/admin/users/${userId}/unban`, { method: 'POST' }),

    removeUser: ({ userId }: { userId: string }) => call<null>(`/admin/users/${userId}`, { method: 'DELETE' }),
  },
};
