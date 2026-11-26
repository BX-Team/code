import {
  type ActivityPage,
  ActivityPageSchema,
  type ConnectedApp,
  ConnectedAppsSchema,
  type DeviceOrigin,
  DeviceOriginSchema,
  type PictureSource,
} from '@bx-team/types/schema/bxid';
import {
  deviceAuthorizationClient,
  emailOTPClient,
  inferAdditionalFields,
  usernameClient,
} from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/vue';
import { apiError } from '~/lib/errors';

export const AUTH_BASE =
  import.meta.env.VITE_AUTH_BASE || (import.meta.dev ? 'http://localhost:8787' : 'https://api.bxteam.org');

export const auth = createAuthClient({
  baseURL: `${AUTH_BASE}/v1/auth`,
  fetchOptions: { credentials: 'include' },
  plugins: [
    emailOTPClient(),
    usernameClient(),
    deviceAuthorizationClient(),
    inferAdditionalFields({
      user: { friendCode: { type: 'string', required: false, input: false } },
      session: {
        city: { type: 'string', required: false, input: false },
        country: { type: 'string', required: false, input: false },
        clientId: { type: 'string', required: false, input: false },
      },
    }),
  ],
});

/** Device-flow apps and their account tab; the line under each is `account.apps.<id>`. */
export const APPS: Record<string, { name: string; page: string }> = {
  riven: { name: 'Riven Launcher', page: '/account/riven' },
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
  if (!response.ok) throw await apiError(response);
  return ActivityPageSchema.parse(await response.json());
}

export async function fetchConnectedApps(): Promise<ConnectedApp[]> {
  const response = await fetch(`${AUTH_BASE}/v1/auth/apps`, { credentials: 'include' });
  if (!response.ok) throw await apiError(response);
  return ConnectedAppsSchema.parse(await response.json()).apps;
}

/** Signs the app out on every device and deletes everything it kept for this BX ID. */
export async function disconnectApp(clientId: string): Promise<void> {
  const response = await fetch(`${AUTH_BASE}/v1/auth/apps/${encodeURIComponent(clientId)}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!response.ok) throw await apiError(response);
}

/** Where a device code claimed by this BX ID was asked for, and where the visitor is now. */
export async function fetchDeviceOrigin(userCode: string): Promise<DeviceOrigin> {
  const response = await fetch(`${AUTH_BASE}/v1/auth/device-origin?user_code=${encodeURIComponent(userCode)}`, {
    credentials: 'include',
  });
  if (!response.ok) throw await apiError(response);
  return DeviceOriginSchema.parse(await response.json());
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
  if (!response.ok) throw await apiError(response);
  auth.$store.notify('$sessionSignal');
}
