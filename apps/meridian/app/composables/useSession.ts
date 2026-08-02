import { authClient } from '@/lib/auth-client';

/**
 * Client-only on purpose: the landing and legal pages are prerendered, so a build-time call would
 * bake a signed-out payload that hydration trusts and never refreshes.
 */
export function useSession() {
  return useAsyncData('auth-session', () => authClient.getSession().then(r => r.data ?? null), { server: false });
}
