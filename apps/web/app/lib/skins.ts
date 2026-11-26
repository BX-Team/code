import {
  type MyProfiles,
  MyProfilesSchema,
  type MySkins,
  MySkinsSchema,
  type Profile,
  ProfileSchema,
  type SkinModel,
} from '@bx-team/types/schema/skins';
import { apiError } from '~/lib/errors';

/** Skins is its own Worker; `bun dev` in `apps/skins` runs it on :8788. */
export const SKINS_BASE =
  import.meta.env.VITE_SKINS_BASE || (import.meta.dev ? 'http://localhost:8788' : 'https://api.bxteam.org');

async function call(path: string, init: RequestInit = {}): Promise<Response> {
  const response = await fetch(`${SKINS_BASE}/v1/skins${path}`, { credentials: 'include', ...init });
  if (!response.ok) throw await apiError(response);
  return response;
}

const json = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

const nick = (name: string) => `/profiles/${encodeURIComponent(name)}`;

/** The skins this BX ID uploaded: the library every nick picks from. */
export async function fetchMySkins(): Promise<MySkins> {
  return MySkinsSchema.parse(await (await call('/me')).json());
}

export async function fetchProfiles(): Promise<MyProfiles> {
  return MyProfilesSchema.parse(await (await call('/profiles')).json());
}

/** Claims a nick, or takes back one released before. */
export async function claimNick(name: string): Promise<Profile> {
  return ProfileSchema.parse(await (await call('/profiles', json({ name }))).json());
}

export async function releaseNick(name: string): Promise<void> {
  await call(nick(name), { method: 'DELETE' });
}

export async function uploadSkin(name: string, file: Blob, model: SkinModel): Promise<Profile> {
  const response = await call(`${nick(name)}/skin?model=${model}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'image/png' },
    body: file,
  });
  return ProfileSchema.parse(await response.json());
}

export async function selectSkin(name: string, hash: string, model: SkinModel): Promise<Profile> {
  return ProfileSchema.parse(await (await call(`${nick(name)}/skin`, json({ hash, model }))).json());
}

export async function resetSkin(name: string): Promise<void> {
  await call(`${nick(name)}/skin`, { method: 'DELETE' });
}
