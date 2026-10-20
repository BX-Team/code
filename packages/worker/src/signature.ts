import { hexToBytes, toHex } from './hex';

const PREFIX = 'sha256=';

function hmacKey(secret: string, usage: 'sign' | 'verify') {
  return crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    usage,
  ]);
}

/** Verifies an `sha256=<hex>` HMAC over the raw body — the shape GitHub and the API share. */
export async function verifySignature(secret: string, header: string | null, body: ArrayBuffer): Promise<boolean> {
  if (!header?.startsWith(PREFIX)) return false;

  const signature = hexToBytes(header.slice(PREFIX.length));
  if (!signature) return false;

  return crypto.subtle.verify('HMAC', await hmacKey(secret, 'verify'), signature, body);
}

export async function sign(secret: string, body: string): Promise<string> {
  const signature = await crypto.subtle.sign('HMAC', await hmacKey(secret, 'sign'), new TextEncoder().encode(body));
  return `${PREFIX}${toHex(signature)}`;
}
