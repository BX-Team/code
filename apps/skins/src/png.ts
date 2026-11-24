const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** A skin's width and height from its PNG header, or `null` when the bytes are not a PNG. */
export function pngSize(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 24 || SIGNATURE.some((b, i) => bytes[i] !== b)) return null;
  // The first chunk must be IHDR: length (4), type (4), then width and height, big-endian.
  if (String.fromCharCode(...bytes.subarray(12, 16)) !== 'IHDR') return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

/** 64×64 skins, and 64×32 ones from before 1.8, which the game still reads. */
export function isSkinSize(size: { width: number; height: number }): boolean {
  return size.width === 64 && (size.height === 64 || size.height === 32);
}
