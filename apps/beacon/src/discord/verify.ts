import { hexToBytes } from '../util/hex';

/* Verifies the Ed25519 signature Discord puts on every interaction request */
export async function verifyInteraction(
  publicKey: string,
  signature: string | null,
  timestamp: string | null,
  body: string,
): Promise<boolean> {
  if (!signature || !timestamp) return false;

  const keyBytes = hexToBytes(publicKey);
  const signatureBytes = hexToBytes(signature);
  if (!keyBytes || !signatureBytes) return false;

  try {
    const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'Ed25519' }, false, ['verify']);
    return await crypto.subtle.verify('Ed25519', key, signatureBytes, new TextEncoder().encode(timestamp + body));
  } catch (error) {
    console.error('Interaction signature verification failed', error);
    return false;
  }
}
