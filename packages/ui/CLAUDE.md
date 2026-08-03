# packages/ui — BX Team Design System

Shared Vue 3 component library for the BX Team monorepo. Dark-first, CSS-variable-driven. No build step — raw `.vue` files are consumed directly; Nuxt handles transpilation via `build.transpile: ['@bx-team/ui']`.

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
| Surfaces | `--bg-0` `--bg-1` `--bg-2` `--bg-3` |
| Borders | `--line` `--line-2` |
| Text | `--mute` `--dim` `--fg` `--fg-hi` |
| Brand (cyan) | `--brand` `--brand-glow` `--brand-soft` |
| Brand 2 (green) | `--brand-2` `--brand-glow-2` `--brand-soft-2` |
| Semantic | `--ok` `--warn` `--err` `--info` |
| Radii | `--r-xs` `--r-sm` `--r-md` `--r-lg` `--r-full` |
| Shadows | `--shadow-card` `--shadow-glow` |
| Fonts | `--font-sans` `--font-mono` |

Utility classes: `.bx-text-grad`, `.bx-container`, `.bx-h1`–`.bx-h5`, `.bx-eyebrow`, `.bx-code-inline`.

## Components

### `BrandMark`
Conic gradient ring logo mark.
```ts
props: { size?: number }  // default 22
```

### `Button`
Renders `<a>` when `href` is provided, otherwise `<button>`.
```ts
props: {
  variant?: 'primary' | 'accent' | 'secondary' | 'ghost'  // default: primary
  size?: 'sm' | 'md' | 'lg'                               // default: md
  href?: string
  disabled?: boolean
}
```
- `primary` — white fill, dark text
- `accent` — brand cyan fill
- `secondary` — transparent, border, hover → brand border
- `ghost` — no border, muted text

### `Badge`
When `dot` is provided renders a status chip with a glowing dot. Otherwise renders a pill badge.
```ts
props: {
  variant?: 'brand' | 'soft' | 'green' | 'warn' | 'err' | 'mono'  // default: soft
  dot?: 'ok' | 'warn' | 'err' | 'info'
}
```

### `Input`
Controlled via `v-model`.
```ts
props: { label?: string; placeholder?: string; type?: string }
```

### `Card`
```ts
props: {
  featured?: boolean       // brand border + glow
  padding?: 'sm' | 'md' | 'lg'  // default: md
}
```

### `Navbar`
Floating glass pill nav. Slot `#right` overrides the Discord CTA.
```ts
interface NavLink { id: string; label: string; href?: string }

props: {
  active?: string
  links?: NavLink[]
  brandHref?: string
  discordHref?: string
  searchEnabled?: boolean
}
emits: { navigate: [id: string]; search: [] }
```

### `Hero`
Full-width hero section with built-in atmosphere glow. Use `noAtmosphere` when the page renders its own atmosphere (e.g. `index.vue`).
```ts
props: {
  kicker?: string
  kickerBadge?: string   // default: 'NEW'
  lede?: string
  noAtmosphere?: boolean
}
slots: #kicker, #title, #lede, #cta
```

### `Footer`
```ts
interface FooterLink   { label: string; href: string }
interface FooterColumn { heading: string; links: FooterLink[] }

props: {
  columns?: FooterColumn[]
  blurb?: string
  location?: string | null  // edge location label, e.g. "Warsaw, PL (WAW)"
  githubHref?: string
  discordHref?: string
}
```

### `FeatureCard`
```ts
props: { title: string; body: string }
slots: #icon  // 36×36 icon wrapper, colour: var(--brand)
```

### `FeatureGrid`
```ts
props: { eyebrow?: string; heading: string; lede?: string }
// default slot: <FeatureCard> children
```

### `ProjectCard`
```ts
props: {
  name: string
  description: string
  tag: string
  version?: string
  archived?: boolean  // dims card + shows "Archived" badge
  href?: string       // full-card overlay link
}
```

### `ProjectsGrid`
```ts
props: { eyebrow?: string; heading: string }
// default slot: <ProjectCard> children
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

## Atmosphere pattern (pages)

Pages that need the brand glow + grid use this structure:

```html
<div class="foo-root">          <!-- position: relative; overflow: hidden -->
  <div class="foo-atmosphere" aria-hidden="true" />  <!-- ::before glow, ::after grid -->
  <div class="page-wrap">...</div>  <!-- position: relative; z-index: 1 -->
</div>
```

```css
.foo-atmosphere::before {
  /* 1200×800 radial blob, blur(50px), opacity 0.55 */
}
.foo-atmosphere::after {
  /* 56px line grid, mask fades to transparent at 75% */
  background-image:
    linear-gradient(to right,  rgba(255,255,255,.03) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255,255,255,.03) 1px, transparent 1px);
  background-size: 56px 56px;
  mask-image: radial-gradient(ellipse 80% 60% at 50% 30%, black 0%, transparent 75%);
}
```
