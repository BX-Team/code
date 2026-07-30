/**
 * Base URL of the azimuth API Worker (auth/atlas/pulsify bounded contexts).
 * The site is fully static, so every dynamic request goes cross-origin to this
 * host; override with VITE_API_BASE at build time to point dev builds elsewhere.
 */
export const API_BASE = import.meta.env.VITE_API_BASE || 'https://api.bxteam.org';

/**
 * Credentialed fetch against azimuth for the session-scoped groups (/auth, /pulsify).
 * The Better Auth session cookie lives on `.bxteam.org`, so cross-origin requests
 * from the static frontend must opt into credentials explicitly.
 */
export function api<T>(path: string, opts?: Parameters<typeof $fetch>[1]): Promise<T> {
  return $fetch<T>(path, { baseURL: API_BASE, credentials: 'include', ...opts });
}
