import { hexToBytes } from '../util/hex';

const PREFIX = 'sha256=';

/* Verifies the HMAC GitHub puts on every delivery */
export async function verifyGithubSignature(
  secret: string,
  header: string | null,
  body: ArrayBuffer,
): Promise<boolean> {
  if (!header?.startsWith(PREFIX)) return false;

  const signature = hexToBytes(header.slice(PREFIX.length));
  if (!signature) return false;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  );

  return crypto.subtle.verify('HMAC', key, signature, body);
}
