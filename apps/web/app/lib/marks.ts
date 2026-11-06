/** One colour of a pixel logo: its fill and the 1×1 squares painted in it. */
export interface MarkLayer {
  fill: string;
  d: string;
}

const deep = (token: string, amount: number) => `color-mix(in srgb, ${token} ${amount}%, #000)`;
const light = (token: string, amount: number) => `color-mix(in srgb, ${token} ${amount}%, #fff)`;

/**
 * The 16×16 pixel logos the projects ship in `.github/branding/`, with each colour swapped
 * for the site's token that plays the same part, so the marks sit in the accent gradient.
 */
export const MARKS: Record<string, MarkLayer[]> = {
  // An isometric block: lit top, the two sides in the accent pair.
  divinemc: [
    {
      fill: 'var(--fg)',
      d: 'M6 0h4v1h-4zM4 1h8v1h-8zM2 2h12v1h-12zM0 3h16v1h-16zM2 4h12v1h-12zM4 5h8v1h-8zM6 6h4v1h-4z',
    },
    {
      fill: 'var(--accent)',
      d: 'M0 4h2v1h-2zM0 5h4v1h-4zM0 6h6v1h-6zM0 7h8v1h-8zM0 8h8v1h-8zM0 9h8v1h-8zM0 10h8v1h-8zM0 11h8v1h-8zM0 12h8v1h-8zM2 13h6v1h-6zM4 14h4v1h-4zM6 15h2v1h-2z',
    },
    {
      fill: deep('var(--accent-2)', 70),
      d: 'M14 4h2v1h-2zM12 5h4v1h-4zM10 6h6v1h-6zM8 7h8v1h-8zM8 8h8v1h-8zM8 9h8v1h-8zM8 10h8v1h-8zM8 11h8v1h-8zM8 12h8v1h-8zM8 13h6v1h-6zM8 14h4v1h-4zM8 15h2v1h-2z',
    },
  ],
  // Three particles, each with a highlight.
  quark: [
    {
      fill: 'var(--accent)',
      d: 'M6 1h3v1h-3zM5 2h1v1h-1zM7 2h3v1h-3zM4 3h1v1h-1zM6 3h5v1h-5zM4 4h7v1h-7zM4 5h7v1h-7zM5 6h5v1h-5zM6 7h3v1h-3z',
    },
    { fill: light('var(--accent)', 55), d: 'M6 2h1v1h-1zM5 3h1v1h-1z' },
    {
      fill: 'var(--accent-2)',
      d: 'M2 8h3v1h-3zM1 9h1v1h-1zM3 9h3v1h-3zM0 10h1v1h-1zM2 10h5v1h-5zM0 11h7v1h-7zM0 12h7v1h-7zM1 13h5v1h-5zM2 14h3v1h-3z',
    },
    { fill: light('var(--accent-2)', 55), d: 'M2 9h1v1h-1zM1 10h1v1h-1z' },
    {
      fill: 'var(--exp)',
      d: 'M11 8h3v1h-3zM10 9h1v1h-1zM12 9h3v1h-3zM9 10h1v1h-1zM11 10h5v1h-5zM9 11h7v1h-7zM9 12h7v1h-7zM10 13h5v1h-5zM11 14h3v1h-3z',
    },
    { fill: light('var(--exp)', 55), d: 'M11 9h1v1h-1zM10 10h1v1h-1z' },
  ],
  // A calendar page with a tick.
  ndailyrewards: [
    {
      fill: 'var(--rule)',
      d: 'M3 1h1v1h-1zM6 1h1v1h-1zM9 1h1v1h-1zM12 1h1v1h-1zM3 2h1v1h-1zM6 2h1v1h-1zM9 2h1v1h-1zM12 2h1v1h-1z',
    },
    { fill: 'var(--accent)', d: 'M1 2h2v1h-2zM4 2h2v1h-2zM7 2h2v1h-2zM10 2h2v1h-2zM13 2h2v1h-2zM1 3h14v1h-14z' },
    { fill: deep('var(--accent)', 60), d: 'M1 4h14v1h-14z' },
    {
      fill: 'var(--fg)',
      d: 'M1 5h14v1h-14zM1 6h11v1h-11zM14 6h1v1h-1zM1 7h10v1h-10zM13 7h2v1h-2zM1 8h9v1h-9zM12 8h3v1h-3zM1 9h2v1h-2zM5 9h4v1h-4zM11 9h4v1h-4zM1 10h3v1h-3zM6 10h2v1h-2zM10 10h5v1h-5zM1 11h4v1h-4zM9 11h6v1h-6zM1 12h5v1h-5zM8 12h7v1h-7zM1 13h14v1h-14z',
    },
    {
      fill: deep('var(--accent-2)', 80),
      d: 'M12 6h2v1h-2zM11 7h2v1h-2zM10 8h2v1h-2zM3 9h2v1h-2zM9 9h2v1h-2zM4 10h2v1h-2zM8 10h2v1h-2zM5 11h4v1h-4zM6 12h2v1h-2z',
    },
    { fill: 'var(--dim)', d: 'M1 14h14v1h-14z' },
  ],
};
