/** Parses the 'YYYY-MM-DD HH:MM:SS' UTC strings the Analytics Engine SQL API returns. */
export function parseAnalyticsDate(value: string): Date {
  if (!value) return new Date(NaN);
  if (value.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(value)) return new Date(value);
  const iso = value.includes('T') ? value : value.replace(' ', 'T');
  return new Date(`${iso}Z`);
}
