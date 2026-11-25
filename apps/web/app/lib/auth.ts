import {
  type ActivityPage,
  ActivityPageSchema,
  type ConnectedApp,
  ConnectedAppsSchema,
  type PictureSource,
} from '@bx-team/types/schema/bxid';
import {
  deviceAuthorizationClient,
  emailOTPClient,
  inferAdditionalFields,
  usernameClient,
} from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/vue';

export const AUTH_BASE =
  import.meta.env.VITE_AUTH_BASE || (import.meta.dev ? 'http://localhost:8787' : 'https://api.bxteam.org');

export const auth = createAuthClient({
  baseURL: `${AUTH_BASE}/v1/auth`,
  fetchOptions: { credentials: 'include' },
  plugins: [
    emailOTPClient(),
    usernameClient(),
    deviceAuthorizationClient(),
    inferAdditionalFields({ user: { friendCode: { type: 'string', required: false, input: false } } }),
  ],
});

/** The apps that sign in through the device flow, by client id, and where the account manages each. */
export const APPS: Record<string, { name: string; about: string; page: string }> = {
  riven: { name: 'Riven Launcher', about: 'Skin and friends', page: '/account/riven' },
};

/** Social sign-in providers by Better Auth's provider id. */
export const PROVIDER_NAMES: Record<string, string> = { discord: 'Discord', github: 'GitHub' };

/** Riven Launcher puts its name in the User-Agent of the sessions it holds. */
export function fromRiven(userAgent?: string | null): boolean {
  return /riven/i.test(userAgent ?? '');
}

/** A page of this BX ID's activity, newest first; pass the previous page's `next` for older events. */
export async function fetchActivity(before?: string | null): Promise<ActivityPage> {
  const query = before ? `?before=${encodeURIComponent(before)}` : '';
  const response = await fetch(`${AUTH_BASE}/v1/auth/activity${query}`, { credentials: 'include' });
  if (!response.ok) throw new Error(`BX ID answered ${response.status}`);
  return ActivityPageSchema.parse(await response.json());
}

export async function fetchConnectedApps(): Promise<ConnectedApp[]> {
  const response = await fetch(`${AUTH_BASE}/v1/auth/apps`, { credentials: 'include' });
  if (!response.ok) throw new Error(`BX ID answered ${response.status}`);
  return ConnectedAppsSchema.parse(await response.json()).apps;
}

/** A path on this site only, so `?next=` cannot send anyone elsewhere. */
export function safeNext(raw: unknown): string {
  return typeof raw === 'string' && raw.startsWith('/') && !raw.startsWith('//') && !raw.startsWith('/\\')
    ? raw
    : '/account';
}

/** Where the current picture came from, read off its host. */
export function pictureSource(image?: string | null): PictureSource {
  if (!image) return 'initial';
  const host = URL.canParse(image) ? new URL(image).hostname : '';
  if (host.endsWith('discordapp.com') || host.endsWith('discord.com')) return 'discord';
  if (host.endsWith('githubusercontent.com') || host.endsWith('github.com')) return 'github';
  return 'initial';
}

export async function setPicture(source: PictureSource): Promise<void> {
  const response = await fetch(`${AUTH_BASE}/v1/auth/picture`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source }),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? `BX ID answered ${response.status}`);
  }
  auth.$store.notify('$sessionSignal');
}
