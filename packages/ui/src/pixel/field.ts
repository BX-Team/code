import { MARK, type PixelGlyph, WORDMARK } from './glyphs';

export type FieldOptions = {
  variant: 'hero' | 'field';
  slot?: HTMLElement | null;
  glyph?: PixelGlyph;
  markSlot?: HTMLElement | null;
  onPainted?: () => void;
};

type Rgb = [number, number, number];

const BAYER = [
  0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54,
  22, 3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29,
  53, 21,
];

const NOISE_SIZE = 128;
const CELLS_PER_NOISE = 9;
const CURSOR_CELLS = 12;
const FIELD_DENSITY = 0.3;

const SLOT_INSET = 48;
const SLOT_FRACTION = 0.88;
const SLOT_MAX = 760;
const CLEAR_REACH = 150;
const HUSH_REACH = 96;
const CLEAR_CURVE = 3;

const SPRITE_STRENGTH = 0.7;
const SPRITE_FIRST_STAMP_WAIT: [number, number] = [1, 2];
const SPRITE_STAMP_WAIT: [number, number] = [2, 3];
const SPRITE_CHARGE_GLOW = 0.4;
const SPRITE_STAMP_CHARGE: [number, number] = [0, 0.2];

const CHARGE_TIME = 1.1;
const CHARGE_FROM = 0.45;
const CHARGE_GROWTH = 1.6;

type Ping = { x: number; y: number; born: number; from: number; to: number; life: number };
type Glow = { x: number; y: number; strength: number; reach: number };
type Stamp = { x: number; y: number; cellPx: number; amp: number };

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
    bg: token('--pixel-bg', '#0e0c0a'),
    dim: token('--pixel-dim', '#2b2721'),
    mid: token('--pixel-mid', '#1f7a6a'),
    lit: token('--pixel-lit', '#25dfdf'),
    hover: token('--pixel-hover', '#7aeaea'),
    crest: token('--pixel-crest', '#c4f6f6'),
    from: token('--accent', '#25dfdf'),
    to: token('--accent-2', '#61da92'),
  };
}

const between = ([lo, hi]: [number, number]) => lo + Math.random() * (hi - lo);

export type PixelFieldHandle = {
  destroy: () => void;
  setSlot: (el: HTMLElement | null) => void;
  setMarkSlot: (el: HTMLElement | null) => void;
};

export function mountPixelField(canvas: HTMLCanvasElement, options: FieldOptions): PixelFieldHandle {
  const host = canvas.parentElement;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!host || !ctx) return { destroy: () => {}, setSlot: () => {}, setMarkSlot: () => {} };

  const isHero = options.variant === 'hero';
  const glyph = options.glyph ?? WORDMARK;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const noise = buildNoise(0x25dfdf);
  const jitter = buildJitter(0x61da92);

  const palette = readPalette(canvas);
  const restInks = Array.from({ length: glyph.width }, (_, col) =>
    mix(palette.from, palette.to, col / Math.max(1, glyph.width - 1)),
  );
  const markInks = Array.from({ length: MARK.width }, (_, col) =>
    mix(palette.from, palette.to, col / Math.max(1, MARK.width - 1)),
  );

  const scope = host.closest('section, footer') ?? host.parentElement ?? host;
  const quietElements = [
    ...scope.querySelectorAll<HTMLElement>('[data-quiet]'),
    ...(isHero ? document.querySelectorAll<HTMLElement>('header a, header button') : []),
  ];
  let slot = options.slot ?? null;
  let markSlot = options.markSlot ?? null;

  let dpr = 1;
  let width = 0;
  let height = 0;
  let cols = 0;
  let rows = 0;
  let wmX = 0;
  let wmY = 0;
  let wmCW = 10;
  let wmCH = 10;
  let cMin = 0;
  let rMin = 0;
  let ramp = new Float32Array(0);
  let mark: { col: number; row: number; scale: number } | null = null;

  const pointer = { x: -1e4, y: -1e4 };
  const sprite = { x: -1e4, y: -1e4, strength: 0 };
  let visible = true;
  let strength = 0;
  let targetStrength = 0;
  let pings: Ping[] = [];
  let holding: { x: number; y: number; start: number } | null = null;
  let spriteHold: { x: number; y: number; start: number; charge: number } | null = null;
  let spriteStampAt = Number.POSITIVE_INFINITY;
  let painted = false;

  const onControl = (target: EventTarget | null) =>
    target instanceof Element &&
    target.closest('a, button, input, select, textarea, label, [role="button"], header, [data-no-stamp]') !== null;

  const chargeOf = (now: number, start: number) => Math.min((now - start) / 1000 / CHARGE_TIME, 1);

  const launch = (x: number, y: number, charge: number, now: number) => {
    const from = CHARGE_FROM + CHARGE_GROWTH * charge;
    pings = [
      ...pings.slice(-3),
      {
        x,
        y,
        born: now,
        from,
        to: (from + 1.0 + 3.2 * charge) * (0.92 + Math.random() * 0.16),
        life: (0.65 + 0.55 * charge) * (0.92 + Math.random() * 0.16),
      },
    ];
  };

  const measure = () => {
    const box = host.getBoundingClientRect();
    if (box.width < 1 || box.height < 1) return false;

    dpr = Math.min(window.devicePixelRatio || 1, 2);
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

    const slotBox = isHero ? slot?.getBoundingClientRect() : undefined;
    const slotWidth = (slotBox?.width ?? Math.min(SLOT_FRACTION * (box.width - SLOT_INSET), SLOT_MAX)) * dpr;
    wmX = slotBox ? (slotBox.left - box.left) * dpr : (width - slotWidth) / 2;
    wmY = ((slotBox?.top ?? box.top) - box.top) * dpr;
    wmCW = slotWidth / glyph.width;
    wmCH = (slotBox ? slotBox.height * dpr : (slotWidth * glyph.height) / glyph.width) / glyph.height;

    cMin = -Math.ceil(wmX / wmCW) - 1;
    rMin = -Math.ceil(wmY / wmCH) - 1;
    cols = Math.ceil((width - wmX) / wmCW) - cMin + 1;
    rows = Math.ceil((height - wmY) / wmCH) - rMin + 1;

    mark = null;
    const markBox = isHero ? markSlot?.getBoundingClientRect() : undefined;
    if (markBox && markBox.width >= 1 && markBox.height >= 1) {
      const scale = Math.max(1, Math.round((markBox.width * dpr) / (MARK.width * wmCW)));
      const centerCol = ((markBox.left + markBox.width / 2 - box.left) * dpr - wmX) / wmCW;
      const centerRow = ((markBox.top + markBox.height / 2 - box.top) * dpr - wmY) / wmCH;
      mark = {
        col: Math.round(centerCol - (MARK.width * scale) / 2),
        row: Math.round(centerRow - (MARK.height * scale) / 2),
        scale,
      };
    }

    const clearElements = isHero
      ? [...scope.querySelectorAll<HTMLElement>('[data-quiet]'), slot, markSlot].filter(el => el !== null)
      : quietElements;
    const quietBoxes = clearElements
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
      const y = wmY + (rMin + r + 0.5) * wmCH;
      const ny = (y / height) * 2 - 1;
      const clear = isHero ? Math.min(1, Math.max(0.16, (y / dpr - 24) / 130)) : FIELD_DENSITY;
      for (let c = 0; c < cols; c++) {
        const x = wmX + (cMin + c + 0.5) * wmCW;
        const nx = (x / width) * 2 - 1;
        const rr = Math.sqrt(nx * nx + ny * ny * 0.82);
        const eased = Math.min(1, Math.max(0, (rr - 0.42) / 0.85));
        ramp[r * cols + c] = (isHero ? eased * eased : 1) * clear * clearOf(x, y);
      }
    }
    return true;
  };

  const nearestTo = (clientX: number, clientY: number) => {
    let nearest = Number.POSITIVE_INFINITY;
    for (const el of quietElements) {
      const rect = el.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) continue;
      const dx = Math.max(rect.left - clientX, 0, clientX - rect.right);
      const dy = Math.max(rect.top - clientY, 0, clientY - rect.bottom);
      nearest = Math.min(nearest, Math.sqrt(dx * dx + dy * dy));
    }
    return nearest;
  };

  const markColumn = (col: number, row: number) => {
    if (!mark) return -1;
    const lx = Math.floor((col - mark.col) / mark.scale);
    const ly = Math.floor((row - mark.row) / mark.scale);
    if (lx < 0 || ly < 0 || lx >= MARK.width || ly >= MARK.height) return -1;
    return MARK.rows[ly][lx] === '1' ? lx : -1;
  };

  const reach = isHero ? HUSH_REACH : CLEAR_REACH;
  const strengthAt = (clientX: number, clientY: number) => {
    const dist = nearestTo(clientX, clientY);
    return dist >= reach ? 1 : (dist / reach) ** CLEAR_CURVE;
  };

  const draw = (time: number) => {
    const t = reducedMotion ? 0 : time / 1000;

    let spriteGoal = 0;
    if (isHero && !reducedMotion) {
      const ts = time / 1000;
      const rx = 0.44 * (1 + 0.1 * Math.sin(ts * 0.11));
      const ry = 0.38 * (1 + 0.1 * Math.sin(ts * 0.09 + 2));
      sprite.x = width * (0.5 + rx * Math.sin(ts * 0.65));
      sprite.y = height * (0.48 + ry * Math.sin(ts * 0.39 + 1.1));
      const box = host.getBoundingClientRect();
      spriteGoal = strengthAt(box.left + sprite.x / dpr, box.top + sprite.y / dpr) * SPRITE_STRENGTH;

      if (spriteStampAt === Number.POSITIVE_INFINITY) spriteStampAt = time + between(SPRITE_FIRST_STAMP_WAIT) * 1000;
      if (!spriteHold && time >= spriteStampAt) {
        spriteHold = { x: sprite.x, y: sprite.y, start: time, charge: between(SPRITE_STAMP_CHARGE) };
      }
      if (spriteHold) {
        spriteHold.x = sprite.x;
        spriteHold.y = sprite.y;
        spriteGoal *= SPRITE_CHARGE_GLOW;
        if (chargeOf(time, spriteHold.start) >= spriteHold.charge) {
          launch(spriteHold.x, spriteHold.y, spriteHold.charge, time);
          spriteHold = null;
          spriteStampAt = time + between(SPRITE_STAMP_WAIT) * 1000;
        }
      }
    }
    sprite.strength += (spriteGoal - sprite.strength) * 0.08;
    strength += (targetStrength - strength) * 0.3;

    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, width, height);

    const reachOf = (level: number) => CURSOR_CELLS * wmCW * (0.45 + 0.55 * level);
    const glows: Glow[] = [];
    if (strength > 0.01) glows.push({ x: pointer.x, y: pointer.y, strength, reach: reachOf(strength) });
    if (sprite.strength > 0.01)
      glows.push({ x: sprite.x, y: sprite.y, strength: sprite.strength, reach: reachOf(sprite.strength) });

    const stamps: Stamp[] = [];
    pings = pings.filter(ping => (time - ping.born) / 1000 < ping.life);
    for (const ping of pings) {
      const age = (time - ping.born) / 1000 / ping.life;
      const grow = 1 - (1 - age) ** 3;
      stamps.push({
        x: ping.x,
        y: ping.y,
        cellPx: wmCW * (ping.from + (ping.to - ping.from) * grow),
        amp: (1 - age) ** 1.7,
      });
    }
    for (const charging of [holding, spriteHold]) {
      if (!charging) continue;
      stamps.push({
        x: charging.x,
        y: charging.y,
        cellPx: wmCW * (CHARGE_FROM + CHARGE_GROWTH * chargeOf(time, charging.start)),
        amp: 0.9,
      });
    }

    const stampAt = (cx: number, cy: number) => {
      let amp = 0;
      for (const stamp of stamps) {
        const lx = Math.floor((cx - stamp.x) / stamp.cellPx + MARK.width / 2);
        const ly = Math.floor((cy - stamp.y) / stamp.cellPx + MARK.height / 2);
        if (lx < 0 || ly < 0 || lx >= MARK.width || ly >= MARK.height) continue;
        if (MARK.rows[ly][lx] === '1' && stamp.amp > amp) amp = stamp.amp;
      }
      return amp;
    };

    const glowAt = (list: Glow[], cx: number, cy: number) => {
      let amount = 0;
      for (const glow of list) {
        const dx = cx - glow.x;
        const dy = cy - glow.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < glow.reach) {
          const falloff = 1 - dist / glow.reach;
          amount = Math.max(amount, falloff * falloff * glow.strength);
        }
      }
      return amount;
    };

    for (let r = 0; r < rows; r++) {
      const row = rMin + r;
      const yTop = wmY + row * wmCH;
      const y = Math.round(yTop);
      const cellH = Math.round(yTop + wmCH) - y;
      const cy = yTop + wmCH / 2;
      for (let c = 0; c < cols; c++) {
        const col = cMin + c;
        if (isHero && col >= 0 && col < glyph.width && row >= 0 && row < glyph.height && glyph.rows[row][col] === '1') {
          continue;
        }
        if (mark && markColumn(col, row) >= 0) continue;

        const shade = ramp[r * cols + c];
        let lum = 0;
        if (shade > 0.002) {
          const u = col / CELLS_PER_NOISE;
          const v = row / CELLS_PER_NOISE;
          const base =
            0.6 * sample(noise, u + t * 0.14, v - t * 0.055) +
            0.4 * sample(noise, u * 0.55 - t * 0.08, v * 0.55 + t * 0.06);
          const twinkle = 0.5 + 0.5 * Math.sin(t * 1.1 + jitter[(row * 37 + col * 11) & 4095] * 6.283);
          lum = shade * (0.3 + 0.52 * base * base + 0.18 * twinkle) * 0.62;
        }

        const xLeft = wmX + col * wmCW;
        const cx = xLeft + wmCW / 2;
        const glowAmount = glowAt(glows, cx, cy);
        lum += glowAmount * 0.6;
        const waveAmount = stamps.length > 0 ? stampAt(cx, cy) : 0;
        lum += waveAmount * 1.15;

        const threshold =
          0.78 * ((BAYER[(row & 7) * 8 + (col & 7)] + 0.5) / 64) + 0.22 * jitter[(row & 63) * 64 + (col & 63)];
        if (lum <= threshold) continue;

        const heat = Math.max(glowAmount, waveAmount);
        ctx.fillStyle = heat > 0.34 ? palette.lit : heat > 0.1 ? palette.mid : palette.dim;
        const x = Math.round(xLeft);
        ctx.fillRect(x, y, Math.round(xLeft + wmCW) - x, cellH);
      }
    }

    if (isHero && slot) {
      const wordGlows = glows.filter(
        glow =>
          glow.x > wmX - glow.reach &&
          glow.x < wmX + glyph.width * wmCW + glow.reach &&
          glow.y > wmY - glow.reach &&
          glow.y < wmY + glyph.height * wmCH + glow.reach,
      );
      for (let row = 0; row < glyph.height; row++) {
        const bits = glyph.rows[row];
        const yTop = wmY + row * wmCH;
        const y = Math.round(yTop);
        const rowHeight = Math.round(yTop + wmCH) - y;
        for (let col = 0; col < glyph.width; col++) {
          if (bits[col] !== '1') continue;
          const xLeft = wmX + col * wmCW;
          const x = Math.round(xLeft);
          let crest = 0;
          if (stamps.length > 0 || wordGlows.length > 0) {
            const cx = xLeft + wmCW / 2;
            const cy = yTop + wmCH / 2;
            crest = Math.max(stamps.length > 0 ? stampAt(cx, cy) : 0, glowAt(wordGlows, cx, cy));
          }
          ctx.fillStyle = crest > 0.45 ? palette.crest : crest > 0.12 ? palette.hover : restInks[col];
          ctx.fillRect(x, y, Math.round(xLeft + wmCW) - x, rowHeight);
        }
      }
    }

    if (mark) {
      const span = MARK.width * mark.scale;
      for (let row = mark.row; row < mark.row + MARK.height * mark.scale; row++) {
        const yTop = wmY + row * wmCH;
        const y = Math.round(yTop);
        const rowHeight = Math.round(yTop + wmCH) - y;
        for (let col = mark.col; col < mark.col + span; col++) {
          const lx = markColumn(col, row);
          if (lx < 0) continue;
          const xLeft = wmX + col * wmCW;
          const x = Math.round(xLeft);
          let crest = 0;
          if (stamps.length > 0 || glows.length > 0) {
            const cx = xLeft + wmCW / 2;
            const cy = yTop + wmCH / 2;
            crest = Math.max(stamps.length > 0 ? stampAt(cx, cy) : 0, glowAt(glows, cx, cy));
          }
          ctx.fillStyle = crest > 0.45 ? palette.crest : crest > 0.12 ? palette.hover : markInks[lx];
          ctx.fillRect(x, y, Math.round(xLeft + wmCW) - x, rowHeight);
        }
      }
    }

    if (!painted && (!isHero || slot)) {
      painted = true;
      options.onPainted?.();
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

  const locate = (event: PointerEvent) => {
    const box = host.getBoundingClientRect();
    return {
      inside:
        event.clientX >= box.left &&
        event.clientX <= box.right &&
        event.clientY >= box.top &&
        event.clientY <= box.bottom,
      strength: strengthAt(event.clientX, event.clientY),
      x: (event.clientX - box.left) * dpr,
      y: (event.clientY - box.top) * dpr,
    };
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!visible) return;
    const { inside, strength: level, x, y } = locate(event);
    if (!holding) targetStrength = inside ? level : 0;
    if (!inside) return;
    pointer.x = x;
    pointer.y = y;
    if (reducedMotion) draw(0);
  };

  const onPointerDown = (event: PointerEvent) => {
    if (!visible || reducedMotion || onControl(event.target)) return;
    const { inside, x, y } = locate(event);
    if (!inside) return;
    pointer.x = x;
    pointer.y = y;
    targetStrength = 0;
    holding = { x, y, start: performance.now() };
  };

  const onPointerUp = (event: PointerEvent) => {
    if (!holding) return;
    if (finePointer) {
      const { inside, strength: level } = locate(event);
      targetStrength = inside ? level : 0;
    }
    const now = performance.now();
    launch(holding.x, holding.y, chargeOf(now, holding.start), now);
    holding = null;
  };

  const onPointerCancel = () => {
    holding = null;
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
      visible = entry.isIntersecting;
      if (reducedMotion || !drawing) return;
      if (visible && frame === 0) frame = requestAnimationFrame(loop);
      else if (!visible && frame !== 0) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    },
    { rootMargin: '64px' },
  );
  visibility.observe(host);

  if (finePointer) window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pointerdown', onPointerDown, { passive: true });
  window.addEventListener('pointerup', onPointerUp, { passive: true });
  window.addEventListener('pointercancel', onPointerCancel, { passive: true });
  window.addEventListener('contextmenu', onPointerCancel, { passive: true });

  const resize = new ResizeObserver(() => {
    if (!measure()) return;
    startDrawing();
    draw(reducedMotion ? 0 : lastDraw);
  });
  resize.observe(host);
  if (isHero && slot) resize.observe(slot);
  if (isHero && markSlot) resize.observe(markSlot);

  const setSlot = (el: HTMLElement | null) => {
    if (!isHero || el === slot) return;
    if (slot) resize.unobserve(slot);
    slot = el;
    if (slot) resize.observe(slot);
    if (measure()) draw(reducedMotion ? 0 : lastDraw);
  };

  const setMarkSlot = (el: HTMLElement | null) => {
    if (!isHero || el === markSlot) return;
    if (markSlot) resize.unobserve(markSlot);
    markSlot = el;
    if (markSlot) resize.observe(markSlot);
    if (measure()) draw(reducedMotion ? 0 : lastDraw);
  };

  const destroy = () => {
    cancelAnimationFrame(frame);
    resize.disconnect();
    visibility.disconnect();
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerCancel);
    window.removeEventListener('contextmenu', onPointerCancel);
  };

  return { destroy, setSlot, setMarkSlot };
}
