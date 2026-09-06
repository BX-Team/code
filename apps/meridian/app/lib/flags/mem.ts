/** `8G`, `8192M`, `8192` (megabytes) — the forms a start script is written with. */
export function parseMemMB(input: string): number | null {
  const text = input.trim();
  if (!text) return null;

  const unit = text[text.length - 1] as string;
  let multiplier = 1;
  let digits = text;
  if (/[gG]/.test(unit)) {
    multiplier = 1024;
    digits = text.slice(0, -1);
  } else if (/[mM]/.test(unit)) {
    digits = text.slice(0, -1);
  } else if (/[kK]/.test(unit)) {
    multiplier = 0;
    digits = text.slice(0, -1);
  }

  const value = Number.parseInt(digits.trim(), 10);
  if (!Number.isFinite(value) || value <= 0) return null;
  return multiplier === 0 ? Math.floor(value / 1024) : value * multiplier;
}

export function formatMemMB(mb: number): string {
  return mb % 1024 === 0 && mb >= 1024 ? `${mb / 1024}G` : `${mb}M`;
}
