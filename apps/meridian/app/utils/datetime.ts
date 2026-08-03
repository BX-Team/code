/** Parses the 'YYYY-MM-DD HH:MM:SS' UTC strings the Analytics Engine SQL API returns. */
export function parseAnalyticsDate(value: string): Date {
  if (!value) return new Date(NaN);
  if (value.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(value)) return new Date(value);
  const iso = value.includes('T') ? value : value.replace(' ', 'T');
  return new Date(`${iso}Z`);
}

export function relativeTime(value: string): string {
  const diff = Date.now() - parseAnalyticsDate(value).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function formatAbsolute(value: string): string {
  return parseAnalyticsDate(value).toLocaleString();
}
