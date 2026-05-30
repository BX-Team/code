import { createHash } from 'node:crypto';

const UUID_RE = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g;
const IPV4_RE = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g;
const IPV6_RE = /\b(?:[0-9a-fA-F]{1,4}:){2,7}[0-9a-fA-F]{1,4}\b/g;
const EMAIL_RE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

/**
 * Removes player-identifying data from text before it is persisted. Error messages and
 * stacktraces routinely carry player UUIDs, IPs and emails; storing them raw would leak
 * personal data into ClickHouse and, via cross-server aggregation, to plugin authors who
 * must never learn who the players behind a crash are. Scrubbing happens at ingest so the
 * data never lands in storage in the first place — the GDPR-safe default.
 */
export function scrub(text: string): string {
  if (!text) return text;
  return text.replace(UUID_RE, '<uuid>').replace(EMAIL_RE, '<email>').replace(IPV6_RE, '<ip>').replace(IPV4_RE, '<ip>');
}

const HEX_RE = /0x[0-9a-fA-F]+/g;
const NUM_RE = /\d+/g;

/**
 * Collapses tokens that vary between otherwise identical crashes (remaining hex blobs and
 * line numbers) so a single logical error groups into one stable fingerprint instead of
 * fanning out into thousands. Runs on already-scrubbed text, so UUIDs/IPs are gone by now.
 */
export function normalizeForFingerprint(text: string): string {
  return text.replace(HEX_RE, '<hex>').replace(NUM_RE, '<n>');
}

/**
 * Stable group key for an error. Computed once at ingest and stored on both the ClickHouse
 * event row and the Postgres issue registry, so the two join on an identical key without
 * relying on fragile regex parity between SQL and TypeScript normalization.
 */
export function computeFingerprint(plugin: string, message: string, level: string, stacktrace: string): string {
  const basis = [plugin, normalizeForFingerprint(message ?? ''), level, normalizeForFingerprint(stacktrace ?? '')].join(
    '\x1f',
  );
  return createHash('md5').update(basis).digest('hex');
}
