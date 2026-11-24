import { type MySkins, MySkinsSchema, type Skin, type SkinModel, SkinSchema } from '@bx-team/types/schema/skins';

/** Skins is its own Worker; `bun dev:id` runs it on :8788 next to BX ID. */
export const SKINS_BASE =
  import.meta.env.VITE_SKINS_BASE || (import.meta.dev ? 'http://localhost:8788' : 'https://api.bxteam.org');

async function call(path: string, init: RequestInit = {}): Promise<Response> {
  const response = await fetch(`${SKINS_BASE}/v1/skins${path}`, { credentials: 'include', ...init });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? `Skins answered ${response.status}`);
  }
  return response;
}

export async function fetchMySkins(): Promise<MySkins> {
  return MySkinsSchema.parse(await (await call('/me')).json());
}

export async function uploadSkin(file: Blob, model: SkinModel): Promise<Skin> {
  const response = await call(`/me?model=${model}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'image/png' },
    body: file,
  });
  return SkinSchema.parse(await response.json());
}

export async function selectSkin(hash: string, model: SkinModel): Promise<Skin> {
  const response = await call('/me/select', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hash, model }),
  });
  return SkinSchema.parse(await response.json());
}

export async function resetSkin(): Promise<void> {
  await call('/me', { method: 'DELETE' });
}
