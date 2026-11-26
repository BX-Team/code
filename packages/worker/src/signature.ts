import { hexToBytes, toHex } from './hex';

const PREFIX = 'sha256=';
const encoder = new TextEncoder();

function hmacKey(secret: string, usage: 'sign' | 'verify') {
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [usage]);
}

export async function hmac(secret: string, data: string | ArrayBuffer): Promise<ArrayBuffer> {
  return crypto.subtle.sign(
    'HMAC',
    await hmacKey(secret, 'sign'),
    typeof data === 'string' ? encoder.encode(data) : data,
  );
}

/** Checks an HMAC-SHA-256 in constant time. */
export async function verifyHmac(
  secret: string,
  mac: Uint8Array<ArrayBuffer>,
  data: string | ArrayBuffer,
): Promise<boolean> {
  return crypto.subtle.verify(
    'HMAC',
    await hmacKey(secret, 'verify'),
    mac,
    typeof data === 'string' ? encoder.encode(data) : data,
  );
}

/** Verifies an `sha256=<hex>` HMAC over the raw body — the shape GitHub and the API share. */
export async function verifySignature(secret: string, header: string | null, body: ArrayBuffer): Promise<boolean> {
  if (!header?.startsWith(PREFIX)) return false;
  const signature = hexToBytes(header.slice(PREFIX.length));
  return signature ? verifyHmac(secret, signature, body) : false;
}

export async function sign(secret: string, body: string): Promise<string> {
  return `${PREFIX}${toHex(await hmac(secret, body))}`;
}
