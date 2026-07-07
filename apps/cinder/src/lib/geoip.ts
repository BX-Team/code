import type { Env } from '../env';

/**
 * GeoIP via IPinfo's Lite API with a Workers KV cache. Per queue batch we collect the
 * unique public IPs, serve what we can from KV, and resolve the rest in a single
 * `/batch/lite` bulk call; results are cached 24h. A failed/timed-out lookup degrades to
 * empty country codes rather than blocking ingestion.
 */

const CACHE_TTL_SECONDS = 24 * 60 * 60;
const IPINFO_BATCH_LIMIT = 1_000;
const IPINFO_TIMEOUT_MS = 5_000;

interface LiteRecord {
  country_code?: string;
}

function normalize(ip: string): string {
  return ip.startsWith('::ffff:') ? ip.slice(7) : ip;
}

function isPrivateOrLocal(ip: string): boolean {
  if (ip === '::1' || ip === '127.0.0.1' || ip.startsWith('127.')) return true;
  if (ip.startsWith('10.') || ip.startsWith('192.168.')) return true;
  if (ip.startsWith('169.254.')) return true;
  if (ip.startsWith('172.')) {
    const second = Number(ip.split('.')[1]);
    if (second >= 16 && second <= 31) return true;
  }
  const lower = ip.toLowerCase();
  if (lower.startsWith('fc') || lower.startsWith('fd') || lower.startsWith('fe80:')) return true;
  return false;
}

/**
 * Resolves a set of raw IPs to ISO country codes, keyed by the original raw string.
 * Private/local/empty IPs resolve to `''`.
 */
export async function resolveCountries(env: Env, rawIps: (string | null | undefined)[]): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const normalizedByRaw = new Map<string, string>();
  const needed = new Set<string>();

  for (const raw of rawIps) {
    if (!raw || result.has(raw) || normalizedByRaw.has(raw)) continue;
    const ip = normalize(raw);
    if (isPrivateOrLocal(ip)) {
      result.set(raw, '');
      continue;
    }
    normalizedByRaw.set(raw, ip);
    needed.add(ip);
  }

  const countryByIp = new Map<string, string>();
  const uncached: string[] = [];

  await Promise.all(
    [...needed].map(async ip => {
      const cached = await env.GEOIP_CACHE.get(`ip:${ip}`);
      if (cached !== null) countryByIp.set(ip, cached);
      else uncached.push(ip);
    }),
  );

  if (uncached.length > 0) {
    const resolved = await bulkLookup(env, uncached.slice(0, IPINFO_BATCH_LIMIT));
    await Promise.all(
      uncached.map(async ip => {
        const cc = resolved.get(ip) ?? '';
        countryByIp.set(ip, cc);
        if (resolved.has(ip)) {
          await env.GEOIP_CACHE.put(`ip:${ip}`, cc, { expirationTtl: CACHE_TTL_SECONDS });
        }
      }),
    );
  }

  for (const [raw, ip] of normalizedByRaw) {
    result.set(raw, countryByIp.get(ip) ?? '');
  }
  return result;
}

async function bulkLookup(env: Env, ips: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  try {
    const res = await fetch(`https://api.ipinfo.io/batch/lite?token=${env.IPINFO_TOKEN}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(ips),
      signal: AbortSignal.timeout(IPINFO_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error(`[geoip] IPinfo batch responded ${res.status}`);
      return out;
    }
    const data = (await res.json()) as Record<string, LiteRecord>;
    for (const ip of ips) {
      out.set(ip, data[ip]?.country_code ?? '');
    }
  } catch (err) {
    console.error('[geoip] IPinfo batch lookup failed:', err);
  }
  return out;
}
