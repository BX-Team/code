export function parseClickhouseDate(value: string): Date {
  if (!value) return new Date(NaN);
  if (value.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(value)) return new Date(value);
  const iso = value.includes('T') ? value : value.replace(' ', 'T');
  return new Date(`${iso}Z`);
}

export function relativeTime(value: string): string {
  const diff = Date.now() - parseClickhouseDate(value).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function formatAbsolute(value: string): string {
  return parseClickhouseDate(value).toLocaleString();
}
