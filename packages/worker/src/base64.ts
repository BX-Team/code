export function toBase64(bytes: ArrayBuffer | Uint8Array): string {
  let binary = '';
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/** Null when `text` is not base64; whitespace inside is ignored, as in PEM bodies. */
export function fromBase64(text: string): Uint8Array<ArrayBuffer> | null {
  try {
    return Uint8Array.from(atob(text.replace(/\s+/g, '')), ch => ch.charCodeAt(0));
  } catch {
    return null;
  }
}

export function toBase64Url(bytes: ArrayBuffer | Uint8Array): string {
  return toBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromBase64Url(text: string): Uint8Array<ArrayBuffer> | null {
  return fromBase64(text.replace(/-/g, '+').replace(/_/g, '/'));
}
