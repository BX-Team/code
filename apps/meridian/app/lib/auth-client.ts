import { createAuthClient } from 'better-auth/client';
import { adminClient, magicLinkClient } from 'better-auth/client/plugins';
import { API_BASE } from '@/lib/api';

export const authClient = createAuthClient({
  baseURL: `${API_BASE}/auth`,
  plugins: [adminClient(), magicLinkClient()],
  fetchOptions: { credentials: 'include' },
});
