/**
 * Wraps a ClickHouse string expression so that values which vary between otherwise
 * identical crashes (UUIDs, IPs, hex blobs, line numbers, coordinates) collapse to
 * placeholders. Used for grouping error events into stable fingerprints — without it
 * a single logical error fans out into thousands of groups, breaking aggregation and
 * "new error" detection.
 */
export function normalizeExpr(column: string): string {
  return `
    replaceRegexpAll(
      replaceRegexpAll(
        replaceRegexpAll(
          replaceRegexpAll(${column},
            '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}', '<id>'),
          '\\b\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\b', '<ip>'),
        '0x[0-9a-fA-F]+', '<hex>'),
      '\\d+', '<n>')
  `;
}

const UUID_RE = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g;
const IPV4_RE = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g;

/**
 * Strips player-identifying data (IP addresses, UUIDs) from text shown to a plugin
 * author in cross-server aggregation. The author must never see who the players or
 * servers behind a crash are — only the crash itself.
 */
export function anonymize(text: string): string {
  if (!text) return text;
  return text.replace(UUID_RE, '<uuid>').replace(IPV4_RE, '<ip>');
}
