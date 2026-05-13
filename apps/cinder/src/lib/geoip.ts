import geoip from 'geoip-lite';

export function lookupCountry(ip: string | null): string {
  if (!ip) return '';
  const normalized = ip.startsWith('::ffff:') ? ip.slice(7) : ip;
  return geoip.lookup(normalized)?.country ?? '';
}
