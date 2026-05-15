import { existsSync, readFileSync, statSync } from 'node:fs';
import { Reader, type ReaderModel } from '@maxmind/geoip2-node';

const DB_PATH = process.env.GEOIP_DB_PATH ?? '/var/lib/geoip/GeoLite2-Country.mmdb';
const RELOAD_INTERVAL_MS = 60 * 60 * 1000;

let reader: ReaderModel | null = null;
let lastLoadedMtimeMs = 0;
let warnedMissing = false;

function tryLoad() {
  if (!existsSync(DB_PATH)) {
    if (!warnedMissing) {
      console.warn(`[geoip] database not found at ${DB_PATH} — country lookups disabled`);
      warnedMissing = true;
    }
    return;
  }
  const mtimeMs = statSync(DB_PATH).mtimeMs;
  if (reader && mtimeMs === lastLoadedMtimeMs) return;
  try {
    reader = Reader.openBuffer(readFileSync(DB_PATH));
    lastLoadedMtimeMs = mtimeMs;
    warnedMissing = false;
    console.log(`[geoip] loaded ${DB_PATH}`);
  } catch (err) {
    console.error(`[geoip] failed to load ${DB_PATH}:`, err);
  }
}

tryLoad();
setInterval(tryLoad, RELOAD_INTERVAL_MS).unref();

function isPrivateOrLocal(ip: string): boolean {
  if (ip === '::1' || ip === '127.0.0.1' || ip.startsWith('127.')) return true;
  if (ip.startsWith('10.') || ip.startsWith('192.168.')) return true;
  if (ip.startsWith('169.254.')) return true;
  if (ip.startsWith('172.')) {
    const second = Number(ip.split('.')[1]);
    if (second >= 16 && second <= 31) return true;
  }
  if (ip.toLowerCase().startsWith('fc') || ip.toLowerCase().startsWith('fd')) return true;
  if (ip.toLowerCase().startsWith('fe80:')) return true;
  return false;
}

export function lookupCountry(ip: string | null): string {
  if (!ip) return '';
  const normalized = ip.startsWith('::ffff:') ? ip.slice(7) : ip;
  if (isPrivateOrLocal(normalized)) return '';
  if (!reader) return '';
  try {
    return reader.country(normalized).country?.isoCode ?? '';
  } catch {
    return '';
  }
}
