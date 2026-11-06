# packages/ui — BX Team Design System

Shared Vue 3 component library for the BX Team monorepo, on the **BX Team Omarchy** design system
(Basalt palette — the previous site's warm `#12100d` ground under the system's Meridian accents) in its
v1.3 "Riven shell", matching the Riven Launcher: dark warm surfaces, Obel Mono
(typographic.systems, SIL OFL) for everything — interface, headings and data alike — soft 6–14px
corners, borders instead of shadows, no blur except under the top bar, and no pixel field anywhere. The one glow allowed is the mark's cyan-to-green gradient washed
over the hero cards and the community band. No build step — raw `.vue` files are consumed directly; Nuxt handles transpilation
via `build.transpile: ['@bx-team/ui']`.

The mark is the design system's 11-cell pixel mark (`BrandMark`, monochrome, `currentColor`), and the
name is always written **BX Team** — never uppercase, not even where the design system sets its
wordmark in caps.

## Package setup

```
src/
├── components/   # Vue 3 SFCs
├── styles/
│   └── tokens.css  # All CSS custom properties + utility classes
└── index.ts      # Single named-export barrel
```

**Exports** (`package.json`):
- `"."` → `./src/index.ts` — all components
- `"./styles"` → `./src/styles/tokens.css` — design tokens

**Consuming apps** must import tokens before Tailwind:
```css
@import "@bx-team/ui/styles";
@import "tailwindcss";
```

## Design tokens (`tokens.css`)

All tokens are CSS custom properties on `:root`. Never hard-code colours — always use vars.

| Category | Variables |
|---|---|
| Surfaces | `--surface-deep` (inset windows, code) `--surface-0` (alt band) `--surface-1` (page) `--surface-card` `--surface-2` (hover) `--surface-3` (inset) |
| Lines | `--line` (cards) `--line-2` (nested, resting border of buttons and fields) `--rule` (dividers, field hover) `--edge` (field focus border) |
| Text | `--mute` `--dim` `--fg` `--fg-hi` |
| Accent | `--accent` (cyan) `--accent-2` (green) `--accent-wash` (tag chip fill) `--ring` |
| Status | `--ok` `--warn` `--err` `--info` `--exp`, channels `--ch-stable` `--ch-beta` `--ch-alpha` `--ch-experimental` |
| Radii | `--r-xs` 4px (inline code, kbd) `--r-1` 6px (small controls, chips, nav) `--r-2` 8px (buttons, inputs, rows) `--r-3` 10px (callouts, panels, inset windows) `--r-4` 14px (cards, modals) `--r-pill` (dots, scrollbar thumbs) |
| Spacing | `--s-1` … `--s-32`, `--container` |
| Shadows | `--shadow-panel` `--shadow-modal` — floating things only; cards never get one |
| Fonts | `--font-sans` (default: body, UI, headings) `--font-mono` (code, versions, hashes, file names, kbd, uppercase labels) — both Obel Mono today, kept apart so either can change alone. `apps/web` loads it through `@nuxt/fonts` from its upstream URL |

The pre-redesign names (`--bg-0…3`, `--brand*`, `--hover*`, `--r-sm…2xl`, `--r-full`, `--shadow-card`)
still resolve, as aliases onto the tokens above, so older pages read the new palette. Prefer the new
names in anything you write.

The accent is rationed: focus ring on buttons and links, link hover, active markers, the one `bx-text-grad`
phrase in each hero, the mark in the top bar, the release values on the flagship card, and `--accent-wash` tag chips. Buttons, borders, fields and body text never take it:
the primary button is the white `--fg` plate, and fields focus with a grey `--edge` border, not the ring.

Utility classes: `.bx-h1`–`.bx-h5`, `.bx-hero-lede`, `.bx-lede`, `.bx-body`, `.bx-body-sm`,
`.bx-caption`, `.bx-micro` (`.bx-eyebrow`), `.bx-link`, `.bx-accent`, `.bx-text-grad`,
`.bx-code-inline`, `.bx-container`, `.bx-channel` (+ `--stable`/`--beta`/`--alpha`/`--experimental`: a
release-channel chip with a dot) and `.bx-callout` (+ `--note`/`--warn`/`--err`/`--exp`, with a
`.bx-callout__mark` label: a rounded panel whose mark word carries the colour — no coloured edge, no tinted fill).

## Components

### `BrandMark`
The pixel mark: an 11-cell frame with the top-left and bottom-right corners opened around a solid core,
`fg` by default; `gradient` fills it with the cyan-to-green accent instead (the top bar uses it). Keep sizes
on whole 2px multiples (22, 44, 66) so the cells stay square. The favicon (`public/favicon.svg`/`.ico` in
`apps/web`) is it too.
```ts
props: { size?: number; gradient?: boolean }  // size defaults to 22
```

### `Button`
Renders `<a>` when `href` is provided, otherwise `<button>`. Riven sizes: 38px (`sm` 30px, `lg` 44px), Obel Mono, `--r-2`.
```ts
props: {
  variant?: 'primary' | 'accent' | 'secondary' | 'ghost'  // default: primary
  size?: 'sm' | 'md' | 'lg'
  href?: string
  disabled?: boolean
}
```
- `primary` — white `fg` plate, bold; hover dims it to 88%. The one loud action on a page
- `accent` — tonal `surface-3` plate, section-level actions (a download)
- `secondary` — outline on `line-2`, `surface-2` on hover
- `ghost` — no border, `mute` text, `surface-2` on hover

### `Badge`
A `surface-3` chip; with `dot`, an uppercase mono status label with a flat dot.
```ts
props: { variant?: 'brand' | 'soft' | 'green' | 'warn' | 'err' | 'mono'; dot?: 'ok' | 'warn' | 'err' | 'info' }
```

### `Input`
Controlled via `v-model`. `surface-deep` inset, `line-2` border, `rule` on hover, `edge` on focus (no ring).
```ts
props: { label?: string; placeholder?: string; type?: string }
```

### `Card`
```ts
props: { featured?: boolean; padding?: 'sm' | 'md' | 'lg' }
```

### `Navbar`
The site-wide bar, after flectone.net: 52px, sticky, `surface-1` at 72% over a `backdrop-filter` blur and no
bottom rule. The blur lives on a `::before` layer, never on the header itself — a filtered header becomes the
containing block of the fixed scrim, which then only shows up once a filter transition ends. On a phone the
sheet drops down with a clip-path and the scrim fades in alongside it. Its row follows the page's own container (`maxWidth` / `gutter`); shells
that lay out edge to edge pass `maxWidth: 'none'`. The gradient mark and wordmark on the left, the links
centred, and on the right a search icon (the shortcut is in its title) plus `#right`, the icon buttons. The
links share one highlight plate that glides to the hovered link and rests on the active one, like Riven's tabs.
`#lead` takes a section's sidebar toggle. Under 1023px the links, search and socials move into a sheet that
drops under the bar, as on omarchy.org. Nothing else may make a bar of its own — `apps/web` wires this one
through `app/components/SiteNav.vue`.
```ts
props: { active?, links?: NavLink[], brandHref?, tag?, githubHref?, discordHref?, searchEnabled?, searchLabel?, maxWidth?, gutter?, linkAs? }
emits: { navigate: [id: string]; search: [] }
slots: #lead, #right
```

### `PageHero`
The top of every inner page (project pages, downloads, team): a rounded `surface-card` panel in the
container, the accent and accent-2 washed in from opposite corners over a faint grid, like the home page's
hero card. Crumbs, a heavy title with an optional badge, tagline and lede, actions, a meta line and a
four-cell stat strip; `#aside` adds a 340px panel to the right of the text (a changelog, say), which drops
under it below 1024px.
```ts
interface PageHeroStat { label: string; value: string; channel?: 'stable' | 'beta' | 'alpha' | 'experimental' }
props: { title: string; tagline?: string; lede?: string; stats?: PageHeroStat[] }
slots: #crumbs, #badge, #cta, #meta, #aside
```

### `Footer`
A plain band under a top rule, after flectone.net: the link columns from the app (`SiteFooter.vue` in
`apps/web`) over a rule, then the BrandMark lockup and the small uppercase not-affiliated line on the left,
copyright, hosting and the open-source link (`githubHref`) on the right. No field, no glow — the social
links live in the bar and the Community column, so the footer does not repeat them.
```ts
interface FooterLink   { label: string; href: string; external?: boolean }
interface FooterColumn { title: string; links: FooterLink[] }
props: { columns: FooterColumn[]; githubHref?: string; brandHref?: string }
```

### `Section`
A block in the page's container — no band, no rule, no background of its own: an optional accent-2
eyebrow, a heavy `h2` and its lede, an optional `#action` link pushed right, then the content (usually cards).
It pads only above itself; the shell that holds the sections pads the bottom of the page.
```ts
props: { id?: string; eyebrow?: string; title?: string; lede?: string }
slots: default, #action
```

### `FeatureCard`
```ts
props: { title: string; body: string; href?: string; linkAs?: string | Component }  // href makes the card a link
slots: #icon
```


