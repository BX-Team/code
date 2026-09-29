# packages/ui — BX Team Design System

Shared Vue 3 component library for the BX Team monorepo, on the **BX Team Omarchy** design system
(Basalt palette — the previous site's warm `#12100d` ground under the system's Meridian accents): dark warm surfaces, JetBrains Mono for everything but headings, Inter for
headings only, 2px corners, borders instead of shadows, no blur and no glow, and a pixel field on the
hero and the footer. No build step — raw `.vue` files are consumed directly; Nuxt handles transpilation
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
| Surfaces | `--surface-deep` (bar, hero, footer) `--surface-0` (alt band) `--surface-1` (page) `--surface-card` `--surface-2` (hover) `--surface-3` (inset) |
| Lines | `--line` (cards) `--line-2` (nested) `--rule` (dividers, decorative) `--edge` (control borders — the only one on anything focusable) |
| Text | `--mute` `--dim` `--fg` `--fg-hi` |
| Accent | `--accent` (cyan) `--accent-2` (green) `--accent-wash` (tag chip fill) `--ring` |
| Pixel field | `--pixel-bg` `--pixel-dim` `--pixel-mid` `--pixel-lit` `--pixel-hover` `--pixel-crest` |
| Status | `--ok` `--warn` `--err` `--info` `--exp`, channels `--ch-stable` `--ch-beta` `--ch-alpha` `--ch-experimental` |
| Radii | `--r-1` 2px (buttons, cards) `--r-2` 3px (inputs) `--r-3` 4px (code) `--r-4` 6px (modals) `--r-pill` (dots only) |
| Spacing | `--s-1` … `--s-32`, `--container` |
| Shadows | `--shadow-panel` `--shadow-modal` — floating things only; cards never get one |
| Fonts | `--font-mono` (default) `--font-heading` / `--font-sans` (headings only) |

The pre-redesign names (`--bg-0…3`, `--brand*`, `--hover*`, `--r-xs…xl`, `--r-full`, `--shadow-card`)
still resolve, as aliases onto the tokens above, so older pages read the new palette. Prefer the new
names in anything you write.

The accent is rationed: focus ring, link hover, active markers, the one `bx-accent` phrase in the hero,
and `--accent-wash` tag chips. Buttons, borders and body text never take it.

Utility classes: `.bx-h1`–`.bx-h5`, `.bx-hero-lede`, `.bx-lede`, `.bx-body`, `.bx-body-sm`,
`.bx-caption`, `.bx-micro` (`.bx-eyebrow`), `.bx-link`, `.bx-accent`, `.bx-text-grad`,
`.bx-code-inline`, `.bx-container`, `.bx-channel` (+ `--stable`/`--beta`/`--alpha`/`--experimental`: a
release-channel chip with a dot) and `.bx-callout` (+ `--note`/`--warn`/`--err`/`--exp`, with a
`.bx-callout__mark` label: a notice with a coloured left edge, never a tinted fill).

## Components

### `BrandMark`
The pixel mark: an 11-cell frame with the top-left and bottom-right corners opened around a solid core,
`fg` by default. Keep sizes on whole 2px multiples (22, 44, 66) so the cells stay square. The field
stamps the same glyph (`MARK` in `src/pixel/glyphs.ts`); `public/favicon.svg`/`.ico` in meridian are it too.
```ts
props: { size?: number }  // default 22
```

### `Button`
Renders `<a>` when `href` is provided, otherwise `<button>`. 40px tall, mono, `--r-1`.
```ts
props: {
  variant?: 'primary' | 'accent' | 'secondary' | 'ghost'  // default: primary
  size?: 'sm' | 'md' | 'lg'
  href?: string
  disabled?: boolean
}
```
- `primary` — `fg` plate, the one loud action on a page
- `accent` — `mute` plate, section-level actions (a download)
- `secondary` — outline on `edge`
- `ghost` — no border, `dim` text

### `Badge`
A mono chip; with `dot`, an uppercase status label with a flat dot.
```ts
props: { variant?: 'brand' | 'soft' | 'green' | 'warn' | 'err' | 'mono'; dot?: 'ok' | 'warn' | 'err' | 'info' }
```

### `Input`
Controlled via `v-model`. `surface-3` fill, `edge` border.
```ts
props: { label?: string; placeholder?: string; type?: string }
```

### `Card`
```ts
props: { featured?: boolean; padding?: 'sm' | 'md' | 'lg' }
```

### `Navbar`
The site-wide bar: full width, 56px, sticky, **opaque** `surface-deep` with a bottom rule — nothing
here uses `backdrop-filter`. Its row follows the page's own container (`maxWidth` / `gutter`) so the
lockup sits above the left edge of the content; shells that lay out edge to edge pass `maxWidth: 'none'`.
`#lead` takes a section's sidebar toggle, `#right` the icon buttons beside the search box. With
`overlay` the bar is transparent while the page's `[data-nav-overlay]` band (the hero, pulled up 56px
under it) is in view and turns opaque once it scrolls away; on a phone it then shows only the mark.
Under 1023px the links, search and socials move into a sheet that drops under the bar, as on omarchy.org. Nothing else may make a bar of its own — `meridian` wires this one through
`app/components/SiteNav.vue`.
```ts
props: { active?, links?: NavLink[], brandHref?, tag?, githubHref?, discordHref?, overlay?, searchEnabled?, searchLabel?, maxWidth?, gutter?, linkAs? }
emits: { navigate: [id: string]; search: [] }
slots: #lead, #right
```

### `PixelField`
The drifting dithered ground after omarchy.org's hero: one lattice, a glow that follows the pointer,
the BrandMark stamped where the field is pressed. It fills its positioned, clipped parent; elements in
the same `section`/`footer` marked `data-quiet` keep the field clear around them and hush the glow. The
engine is `src/pixel/field.ts`, the bitmaps (`BX Team` wordmark, the stamp) `src/pixel/glyphs.ts`.
At most two per page — the page's top band and the footer.
```ts
props: { variant?: 'hero' | 'field'; slotEl?: HTMLElement | null; markEl?: HTMLElement | null }  // hero draws the wordmark into slotEl, the mark into markEl
emits: { painted: [] }
```

### `Hero`
The home page's opening band: full viewport height, pulled up under an `overlay` bar, `PixelField` in `hero` mode.
Left-aligned in the container: the pixel "BX Team" wordmark drawn into the field, then the headline in
mono, a lede and two buttons. On the right the BrandMark, drawn into the same lattice at a whole-cell
scale, so the glow and the stamps light it like the word. Below 860px the mark is dropped and the
column centres. Both glyphs have an
SVG copy server-rendered in their boxes and hidden once the canvas paints.
```ts
props: { lede?: string }
slots: #title (the h1, mono), #cta
```

### `PageHero`
The top band of every inner page that has one (project pages, downloads): `PixelField` on
`surface-deep`, pulled up under an `overlay` bar (`PageShell overlay`), then crumbs, a sans title with an
optional badge, mono tagline and lede, actions, a meta line and a four-cell stat strip; `#aside` adds a
340px panel to the right of the text (a changelog, say), which drops under it below 1024px.
```ts
interface PageHeroStat { label: string; value: string; channel?: 'stable' | 'beta' | 'alpha' | 'experimental' }
props: { title: string; tagline?: string; lede?: string; stats?: PageHeroStat[] }
slots: #crumbs, #badge, #cta, #meta, #aside
```

### `Footer`
`surface-deep` with a `PixelField`, the BrandMark lockup, blurb and social icons on the left, link
columns on the right, legal line under a rule. Columns come from the app (`SiteFooter.vue` in meridian).
```ts
interface FooterLink   { label: string; href: string; external?: boolean }
interface FooterColumn { title: string; links: FooterLink[] }
props: { columns: FooterColumn[]; blurb?: string; githubHref?: string; discordHref?: string; brandHref?: string }
```

### `Section`
A full-width band: left-aligned sans `h2`, mono lede, an optional `#action` link pushed right.
`alt` moves it onto `surface-0`; stacked sections alternate so two bands never read as one.
```ts
props: { id?: string; eyebrow?: string; title?: string; lede?: string; alt?: boolean }
slots: default, #action
```

### `FeatureCard`
```ts
props: { title: string; body: string; href?: string; linkAs?: string | Component }  // href makes the card a link
slots: #icon
```


### `ProjectCard`
The whole card is one link to the project's page.
```ts
props: { name; description; tag; archived?; href: string; linkAs?: string | Component }
```

## Responsive design

All components must work on both desktop and mobile. Use Tailwind responsive prefixes (`sm:`, `md:`, `lg:`) — never write desktop-only layouts. Touch targets must be at least 44×44px. Avoid hover-only interactions; ensure equivalent tap/touch behaviour on mobile.

## Code guidelines

- **Indentation:** TAB everywhere, never spaces.
- **Styles:** `<style scoped>` on every component. Use `var(--*)` tokens — never raw hex or `oklch()` literals unless a one-off UI detail (e.g. channel badge colours inside a page).
- **No comments** unless the why is non-obvious.
- **Props** — always typed with `defineProps<{...}>()`. Use `withDefaults` only when defaults are non-trivial.
- **No shadcn-vue.** Pages and components in `apps/meridian` must import from `@bx-team/ui`, not from `@/components/ui/*`.
- **Icons** come from `@lucide/vue`. Standard props: `:size="16" :stroke-width="1.7"`.
- **Adding a component:** create `src/components/MyComponent.vue`, add a named export to `src/index.ts`.
