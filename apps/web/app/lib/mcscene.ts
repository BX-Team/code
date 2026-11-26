// Drawn here, as Mojang's textures are not ours to ship; deterministic, so prerender and client agree.

function rng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

const uri = (svg: string) => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;

/** The darkened dirt every menu screen sits on, as a 16×16 tile. */
export const DIRT = (() => {
  const random = rng(7);
  const shades = ['#3b2a1d', '#45301f', '#4f3826', '#5a402b', '#33251a', '#6b4d33'];
  let rects = '';
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const shade = shades[Math.floor(random() * shades.length)];
      rects += `<rect x="${x}" y="${y}" width="1" height="1" fill="${shade}"/>`;
    }
  }
  return uri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">${rects}</svg>`);
})();

/** Dusk over blocky hills, for the screens that happen in the world. */
export const LANDSCAPE = (() => {
  const random = rng(42);
  const width = 96;
  const height = 54;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMax slice" shape-rendering="crispEdges">`;
  svg += '<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1">';
  svg +=
    '<stop offset="0" stop-color="#2f6f9a"/><stop offset="0.65" stop-color="#7cb3c9"/><stop offset="1" stop-color="#c7d9c4"/>';
  svg += `</linearGradient></defs><rect width="${width}" height="${height}" fill="url(#s)"/>`;
  svg += '<rect x="72" y="8" width="6" height="6" fill="#fff6d5"/>';

  const ridge = (base: number, spread: number, colour: string, under?: string) => {
    let h = base;
    for (let x = 0; x < width; x += 2) {
      h = Math.min(height - 4, Math.max(base - spread, h + Math.round((random() - 0.5) * 3)));
      svg += `<rect x="${x}" y="${h}" width="2" height="${height - h}" fill="${colour}"/>`;
      if (under) svg += `<rect x="${x}" y="${h + 1}" width="2" height="${height - h}" fill="${under}"/>`;
    }
  };
  ridge(30, 6, '#4f7f74');
  ridge(38, 4, '#3d6b4a');
  ridge(46, 3, '#5d9a3c', '#6b4a2f');
  return uri(`${svg}</svg>`);
})();

/** Minecraft draws a shadow under text in the same colour at a quarter of its brightness. */
export function textShadow(hex: string, offset = 2): string {
  const value = Number.parseInt(hex.slice(1), 16);
  const r = ((value >> 16) & 255) >> 2;
  const g = ((value >> 8) & 255) >> 2;
  const b = (value & 255) >> 2;
  return `${offset}px ${offset}px 0 rgb(${r} ${g} ${b})`;
}

export type PreviewMode = 'chat' | 'title' | 'motd' | 'item' | 'nametag' | 'kick';

export const PREVIEW_MODES: { id: PreviewMode; label: string }[] = [
  { id: 'chat', label: 'Chat' },
  { id: 'title', label: 'Title' },
  { id: 'motd', label: 'MOTD' },
  { id: 'item', label: 'Item' },
  { id: 'nametag', label: 'Nametag' },
  { id: 'kick', label: 'Disconnect' },
];
