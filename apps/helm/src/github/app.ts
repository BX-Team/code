import type { Env } from '../env';
import { Github } from './client';

interface CachedToken {
  token: string;
  expiresAt: number;
}

/** Installation tokens live an hour; an isolate reuses one until five minutes before that. */
const tokens = new Map<number, CachedToken>();
const REFRESH_MARGIN_MS = 5 * 60 * 1000;

/** A client acting as the app's installation, the identity every write goes out under. */
export async function installationClient(env: Env, installationId: number): Promise<Github> {
  const cached = tokens.get(installationId);
  if (cached && cached.expiresAt - REFRESH_MARGIN_MS > Date.now()) return new Github(cached.token);

  const app = new Github(await appJwt(env));
  const issued = await app.request<{ token: string; expires_at: string }>(
    'POST',
    `/app/installations/${installationId}/access_tokens`,
  );

  tokens.set(installationId, { token: issued.token, expiresAt: Date.parse(issued.expires_at) });
  return new Github(issued.token);
}

async function appJwt(env: Env): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  // Backdated a minute against clock drift; GitHub refuses anything over ten minutes.
  const claims = { iat: now - 60, exp: now + 9 * 60, iss: env.GITHUB_APP_ID };
  const unsigned = `${base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${base64url(JSON.stringify(claims))}`;

  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToDer(env.GITHUB_APP_PRIVATE_KEY),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned));

  return `${unsigned}.${base64url(new Uint8Array(signature))}`;
}

function pemToDer(pem: string): ArrayBuffer {
  if (pem.includes('BEGIN RSA PRIVATE KEY')) {
    throw new Error('GITHUB_APP_PRIVATE_KEY is PKCS#1; convert it with `openssl pkcs8 -topk8 -nocrypt`');
  }

  const body = pem.replace(/-----(BEGIN|END) PRIVATE KEY-----/g, '').replace(/\s+/g, '');
  const binary = atob(body);
  const der = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) der[i] = binary.charCodeAt(i);
  return der.buffer;
}

function base64url(input: string | Uint8Array): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
