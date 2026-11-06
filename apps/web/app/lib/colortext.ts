export type OutputFormat = 'minimessage' | 'legacy-hex' | 'spigot-hex' | 'legacy';

export interface Decorations {
  bold: boolean;
  italic: boolean;
  underlined: boolean;
  strikethrough: boolean;
}

/** One character and the colour it ends up with. */
export interface Glyph {
  char: string;
  color: string;
}

/** The sixteen chat colours, by their legacy code. */
export const LEGACY_COLORS: { code: string; name: string; hex: string }[] = [
  { code: '0', name: 'black', hex: '#000000' },
  { code: '1', name: 'dark_blue', hex: '#0000aa' },
  { code: '2', name: 'dark_green', hex: '#00aa00' },
  { code: '3', name: 'dark_aqua', hex: '#00aaaa' },
  { code: '4', name: 'dark_red', hex: '#aa0000' },
  { code: '5', name: 'dark_purple', hex: '#aa00aa' },
  { code: '6', name: 'gold', hex: '#ffaa00' },
  { code: '7', name: 'gray', hex: '#aaaaaa' },
  { code: '8', name: 'dark_gray', hex: '#555555' },
  { code: '9', name: 'blue', hex: '#5555ff' },
  { code: 'a', name: 'green', hex: '#55ff55' },
  { code: 'b', name: 'aqua', hex: '#55ffff' },
  { code: 'c', name: 'red', hex: '#ff5555' },
  { code: 'd', name: 'light_purple', hex: '#ff55ff' },
  { code: 'e', name: 'yellow', hex: '#ffff55' },
  { code: 'f', name: 'white', hex: '#ffffff' },
];

const DECORATION_CODES: [keyof Decorations, string, string][] = [
  ['bold', 'l', 'bold'],
  ['italic', 'o', 'italic'],
  ['underlined', 'n', 'underlined'],
  ['strikethrough', 'm', 'strikethrough'],
];

export const HEX_PATTERN = /^#[0-9a-f]{6}$/i;

const toRgb = (hex: string): [number, number, number] => {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
};

const toHex = (rgb: number[]) => `#${rgb.map(c => Math.round(c).toString(16).padStart(2, '0')).join('')}`;

/** The colour at `t` in 0..1 along evenly spaced stops, mixed in sRGB as MiniMessage does. */
export function sample(stops: string[], t: number): string {
  if (stops.length === 1) return (stops[0] as string).toLowerCase();
  const scaled = Math.min(Math.max(t, 0), 1) * (stops.length - 1);
  const index = Math.min(Math.floor(scaled), stops.length - 2);
  const local = scaled - index;
  const a = toRgb(stops[index] as string);
  const b = toRgb(stops[index + 1] as string);
  return toHex(a.map((c, i) => c + ((b[i] as number) - c) * local));
}

/** Spreads the stops evenly over the characters, first to last. */
export function paint(text: string, stops: string[]): Glyph[] {
  const chars = [...text];
  const steps = Math.max(chars.length - 1, 1);
  return chars.map((char, i) => ({ char, color: sample(stops, i / steps) }));
}

function decorationTags(decorations: Decorations) {
  return DECORATION_CODES.filter(([key]) => decorations[key]);
}

function legacyCodes(decorations: Decorations, sign: string): string {
  return decorationTags(decorations)
    .map(([, code]) => `${sign}${code}`)
    .join('');
}

/** A legacy colour code resets every decoration, so they are repeated after each one. */
function perGlyph(glyphs: Glyph[], decorations: Decorations, sign: string, color: (hex: string) => string): string {
  const keep = decorations.underlined || decorations.strikethrough;
  const after = legacyCodes(decorations, sign);
  let out = '';
  let last = '';
  for (const glyph of glyphs) {
    const visible = keep || glyph.char.trim() !== '';
    const code = color(glyph.color);
    if (visible && code !== last) {
      out += code + after;
      last = code;
    }
    out += glyph.char;
  }
  return out;
}

function nearestLegacy(hex: string): string {
  const [r, g, b] = toRgb(hex);
  let best = LEGACY_COLORS[15] as (typeof LEGACY_COLORS)[number];
  let distance = Number.POSITIVE_INFINITY;
  for (const candidate of LEGACY_COLORS) {
    const [cr, cg, cb] = toRgb(candidate.hex);
    const d = (r - cr) ** 2 + (g - cg) ** 2 + (b - cb) ** 2;
    if (d < distance) {
      distance = d;
      best = candidate;
    }
  }
  return best.code;
}

function miniMessage(text: string, stops: string[], decorations: Decorations): string {
  const escaped = text.replace(/\\/g, '\\\\').replace(/</g, '\\<');
  const open = decorationTags(decorations).map(([, , tag]) => `<${tag}>`);
  const close = decorationTags(decorations)
    .reverse()
    .map(([, , tag]) => `</${tag}>`);
  const coloured =
    stops.length === 1
      ? `<${(stops[0] as string).toLowerCase()}>${escaped}`
      : `<gradient:${stops.map(s => s.toLowerCase()).join(':')}>${escaped}</gradient>`;
  return `${open.join('')}${coloured}${close.join('')}`;
}

export function render(
  text: string,
  stops: string[],
  decorations: Decorations,
  format: OutputFormat,
  sign: '&' | '§',
): string {
  if (!text) return '';
  if (format === 'minimessage') return miniMessage(text, stops, decorations);

  const glyphs = paint(text, stops);
  switch (format) {
    case 'legacy-hex':
      return perGlyph(glyphs, decorations, sign, hex => `${sign}#${hex.slice(1)}`);
    case 'spigot-hex':
      return perGlyph(
        glyphs,
        decorations,
        sign,
        hex => `${sign}x${[...hex.slice(1)].map(c => `${sign}${c}`).join('')}`,
      );
    case 'legacy':
      return perGlyph(glyphs, decorations, sign, hex => `${sign}${nearestLegacy(hex)}`);
  }
}

/** The colour a glyph is actually shown in once the format has had its say. */
export function displayed(glyph: Glyph, format: OutputFormat): string {
  if (format !== 'legacy') return glyph.color;
  const code = nearestLegacy(glyph.color);
  return LEGACY_COLORS.find(c => c.code === code)?.hex ?? glyph.color;
}
