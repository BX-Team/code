import geoip from 'geoip-lite';

export function lookupCountry(ip: string | null): string {
  if (!ip) return '';
  return geoip.lookup(ip)?.country ?? '';
}
