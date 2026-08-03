# apps/meridian - BX Team website

Nuxt 4 application serving the main BX Team website. Uses Vue 3, Tailwind CSS v4, and file-based routing.

## Architecture
Nuxt 4, **fully static** — the site is built with `nuxt generate` and deployed as Cloudflare Workers Static Assets (`wrangler.jsonc` + `worker.ts`, which only serves assets and the `200.html` SPA fallback). There is no runtime Nitro server and there are no user accounts. Content pages (docs, landing) are prerendered; the data-driven `/downloads` section is client-rendered (`ssr: false` route rules) and reads the public `/atlas` group of the `azimuth` API Worker at `https://api.bxteam.org` (`API_BASE` in `app/lib/api.ts`, typed helpers in `app/lib/atlas.ts`). Tailwind CSS for styling.

## Key Directories
- **`app/pages/`** — file-based routing
- **`app/components/`** — website-specific components
- **`app/layouts/`** — Nuxt layout components
- **`app/lib/`** — API base URL (`api.ts`) and the Atlas client (`atlas.ts`)
- **`app/assets/`** — static assets like images, fonts, and styles

## Components
Shared components come from `@bx-team/ui` — see [`packages/ui/CLAUDE.md`](../../packages/ui/CLAUDE.md). Add a page-specific component under `app/components/` only when it has no reuse outside this app; anything reusable belongs in `@bx-team/ui`.

## Responsive design

All pages and components must be fully responsive — usable on both desktop and mobile. Use Tailwind responsive prefixes (`sm:`, `md:`, `lg:`) to adapt layouts. Touch targets must be at least 44×44px. Never rely on hover-only interactions; ensure equivalent behaviour on touch screens.

## Running dev server
Don't start the dev server via Bash commands, user will run development server by himself. Just make sure to run `bun install` in the project root to install dependencies, and then the user can start the dev server with `bun --bun dev`.
