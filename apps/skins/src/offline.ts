/** `UUID.nameUUIDFromBytes("OfflinePlayer:" + name)`, as an offline-mode server derives it; case matters. */
export async function offlineUuid(name: string): Promise<string> {
  // Workers' Web Crypto has MD5, which browsers leave out.
  const digest = new Uint8Array(await crypto.subtle.digest('MD5', new TextEncoder().encode(`OfflinePlayer:${name}`)));
  digest[6] = ((digest[6] as number) & 0x0f) | 0x30;
  digest[8] = ((digest[8] as number) & 0x3f) | 0x80;
  return [...digest].map(byte => byte.toString(16).padStart(2, '0')).join('');
}
