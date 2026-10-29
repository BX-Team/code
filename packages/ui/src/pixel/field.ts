export type FieldOptions = {
  variant: 'hero' | 'field';
};

type Rgb = [number, number, number];

const BAYER = [
  0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54,
  22, 3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29,
  53, 21,
];

const NOISE_SIZE = 128;
const CELLS_PER_NOISE = 9;
const FIELD_DENSITY = 0.3;

const SPAN_CELLS = 65;
const SPAN_INSET = 48;
const SPAN_FRACTION = 0.88;
const SPAN_MAX = 760;
const CLEAR_REACH = 150;
const HUSH_REACH = 96;
const CLEAR_CURVE = 3;

const DRIFT = 0.25;
const BREATH_RATE = 0.12;
const SPARKLE_SHARE = 0.05;
const SPARKLE_SHARPNESS = 12;
const SPARKLE_RATE: [number, number] = [0.05, 0.15];

function lcg(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function buildNoise(seed: number) {
  const size = NOISE_SIZE;
  const random = lcg(seed);
  let field = new Float32Array(size * size);
  for (let i = 0; i < field.length; i++) field[i] = random();

  for (let pass = 0; pass < 2; pass++) {
    const next = new Float32Array(size * size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        let sum = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            sum += field[((y + dy + size) % size) * size + ((x + dx + size) % size)];
          }
        }
        next[y * size + x] = sum / 9;
      }
    }
    field = next;
  }

  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const v of field) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const span = max - min || 1;
  for (let i = 0; i < field.length; i++) field[i] = (field[i] - min) / span;
  return field;
}

function buildJitter(seed: number) {
  const random = lcg(seed);
  const tile = new Float32Array(64 * 64);
  for (let i = 0; i < tile.length; i++) tile[i] = random();
  return tile;
}

function sample(field: Float32Array, x: number, y: number) {
  const size = NOISE_SIZE;
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const fx = x - xi;
  const fy = y - yi;
  const x0 = ((xi % size) + size) % size;
  const y0 = ((yi % size) + size) % size;
  const x1 = (x0 + 1) % size;
  const y1 = (y0 + 1) % size;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const a = field[y0 * size + x0];
  const b = field[y0 * size + x1];
  const c = field[y1 * size + x0];
  const d = field[y1 * size + x1];
  return (a * (1 - sx) + b * sx) * (1 - sy) + (c * (1 - sx) + d * sx) * sy;
}

function parse(css: string): Rgb | null {
  const hex = /^#([0-9a-f]{6})$/i.exec(css.trim());
  if (hex) {
    const n = Number.parseInt(hex[1], 16);
    return [n >> 16, (n >> 8) & 255, n & 255];
  }
  const rgb = /^rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)/i.exec(css.trim());
  return rgb ? [+rgb[1], +rgb[2], +rgb[3]] : null;
}

function mix(from: string, to: string, t: number) {
  const a = parse(from);
  const b = parse(to);
  if (!a || !b) return t < 0.5 ? from : to;
  const c = a.map((v, i) => Math.round(v + (b[i] - v) * t));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

function readPalette(el: Element) {
  const style = getComputedStyle(el);
  const token = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
  return {
    dim: token('--pixel-dim', '#2b2721'),
    mid: token('--pixel-mid', '#1f7a6a'),
    from: token('--accent', '#25dfdf'),
    to: token('--accent-2', '#61da92'),
  };
}

export type PixelFieldHandle = {
  destroy: () => void;
};

export function mountPixelField(canvas: HTMLCanvasElement, options: FieldOptions): PixelFieldHandle {
  const host = canvas.parentElement;
  const ctx = canvas.getContext('2d');
  if (!host || !ctx) return { destroy: () => {} };

  const isHero = options.variant === 'hero';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const noise = buildNoise(0x25dfdf);
  const jitter = buildJitter(0x61da92);

  const palette = readPalette(canvas);
  const sparkInks = Array.from({ length: 12 }, (_, i) => mix(palette.from, palette.to, i / 11));

  const scope = host.closest('section, footer') ?? host.parentElement ?? host;
  const quietElements = [...scope.querySelectorAll<HTMLElement>('[data-quiet]')];

  let width = 0;
  let height = 0;
  let cols = 0;
  let rows = 0;
  let originX = 0;
  let cell = 10;
  let cMin = 0;
  let ramp = new Float32Array(0);

  const measure = () => {
    const box = host.getBoundingClientRect();
    if (box.width < 1 || box.height < 1) return false;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const nextWidth = Math.round(box.width * dpr);
    const nextHeight = Math.round(box.height * dpr);
    if (nextWidth !== width || nextHeight !== height) {
      width = nextWidth;
      height = nextHeight;
      canvas.width = width;
      canvas.height = height;
    }
    canvas.style.width = `${box.width}px`;
    canvas.style.height = `${box.height}px`;

    // The lattice is sized off a centred reference span, so its cells match from page to page.
    const span = Math.min(SPAN_FRACTION * (box.width - SPAN_INSET), SPAN_MAX) * dpr;
    cell = span / SPAN_CELLS;
    originX = (width - span) / 2;
    cMin = -Math.ceil(originX / cell) - 1;
    cols = Math.ceil((width - originX) / cell) - cMin + 1;
    rows = Math.ceil(height / cell) + 1;

    const quietBoxes = quietElements
      .map(el => el.getBoundingClientRect())
      .filter(rect => rect.width >= 1 && rect.height >= 1)
      .map(rect => ({
        l: (rect.left - box.left) * dpr,
        t: (rect.top - box.top) * dpr,
        r: (rect.right - box.left) * dpr,
        b: (rect.bottom - box.top) * dpr,
      }));
    const clearReach = (isHero ? HUSH_REACH : CLEAR_REACH) * dpr;
    const clearOf = (x: number, y: number) => {
      if (quietBoxes.length === 0) return 1;
      let nearest = Number.POSITIVE_INFINITY;
      for (const q of quietBoxes) {
        const dx = Math.max(q.l - x, 0, x - q.r);
        const dy = Math.max(q.t - y, 0, y - q.b);
        nearest = Math.min(nearest, Math.sqrt(dx * dx + dy * dy));
      }
      return nearest >= clearReach ? 1 : (nearest / clearReach) ** CLEAR_CURVE;
    };

    ramp = new Float32Array(cols * rows);
    for (let r = 0; r < rows; r++) {
      const y = (r + 0.5) * cell;
      const ny = (y / height) * 2 - 1;
      const clear = isHero ? Math.min(1, Math.max(0.16, (y / dpr - 24) / 130)) : FIELD_DENSITY;
      for (let c = 0; c < cols; c++) {
        const x = originX + (cMin + c + 0.5) * cell;
        const nx = (x / width) * 2 - 1;
        const rr = Math.sqrt(nx * nx + ny * ny * 0.82);
        const eased = Math.min(1, Math.max(0, (rr - 0.42) / 0.85));
        ramp[r * cols + c] = (isHero ? eased * eased : 1) * clear * clearOf(x, y);
      }
    }
    return true;
  };

  const draw = (time: number) => {
    const t = reducedMotion ? 0 : time / 1000;
    ctx.clearRect(0, 0, width, height);

    for (let row = 0; row < rows; row++) {
      const y = Math.round(row * cell);
      const cellH = Math.round((row + 1) * cell) - y;
      for (let c = 0; c < cols; c++) {
        const shade = ramp[row * cols + c];
        if (shade <= 0.002) continue;

        const col = cMin + c;
        const u = col / CELLS_PER_NOISE;
        const v = row / CELLS_PER_NOISE;
        const base =
          0.6 * sample(noise, u + t * 0.14 * DRIFT, v - t * 0.055 * DRIFT) +
          0.4 * sample(noise, u * 0.55 - t * 0.08 * DRIFT, v * 0.55 + t * 0.06 * DRIFT);
        const seed = jitter[(row * 37 + col * 11) & 4095];
        const twinkle = 0.5 + 0.5 * Math.sin(t * BREATH_RATE + seed * 6.283);
        let lum = shade * (0.3 + 0.52 * base * base + 0.18 * twinkle) * 0.62;

        // One cell in twenty slowly kindles over several seconds and dies back, each on its own long cycle.
        let sparkle = 0;
        if (jitter[(row * 13 + col * 29 + 7) & 4095] > 1 - SPARKLE_SHARE) {
          const pace = jitter[(row * 53 + col * 17 + 3) & 4095];
          const rate = SPARKLE_RATE[0] + pace * (SPARKLE_RATE[1] - SPARKLE_RATE[0]);
          const wave = Math.sin(t * rate + seed * 6.283);
          if (wave > 0) sparkle = wave ** SPARKLE_SHARPNESS * Math.min(1, shade * 3);
          lum += sparkle;
        }

        const threshold =
          0.78 * ((BAYER[(row & 7) * 8 + (col & 7)] + 0.5) / 64) + 0.22 * jitter[(row & 63) * 64 + (col & 63)];
        if (lum <= threshold) continue;

        const xLeft = originX + col * cell;
        const x = Math.round(xLeft);
        ctx.fillStyle =
          sparkle > 0.34
            ? sparkInks[Math.min(sparkInks.length - 1, Math.max(0, Math.floor((x / width) * sparkInks.length)))]
            : sparkle > 0.1
              ? palette.mid
              : palette.dim;
        ctx.fillRect(x, y, Math.round(xLeft + cell) - x, cellH);
      }
    }
  };

  let frame = 0;
  let lastDraw = 0;
  const loop = (time: number) => {
    frame = requestAnimationFrame(loop);
    if (time - lastDraw < 25) return;
    lastDraw = time;
    draw(time);
  };

  let drawing = false;
  const startDrawing = () => {
    if (drawing) return;
    drawing = true;
    if (reducedMotion) draw(0);
    else frame = requestAnimationFrame(loop);
  };
  if (measure()) startDrawing();

  const visibility = new IntersectionObserver(
    ([entry]) => {
      if (reducedMotion || !drawing) return;
      if (entry.isIntersecting && frame === 0) frame = requestAnimationFrame(loop);
      else if (!entry.isIntersecting && frame !== 0) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    },
    { rootMargin: '64px' },
  );
  visibility.observe(host);

  const resize = new ResizeObserver(() => {
    if (!measure()) return;
    startDrawing();
    draw(reducedMotion ? 0 : lastDraw);
  });
  resize.observe(host);

  const destroy = () => {
    cancelAnimationFrame(frame);
    resize.disconnect();
    visibility.disconnect();
  };

  return { destroy };
}
