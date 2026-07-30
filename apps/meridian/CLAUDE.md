# apps/meridian - BX Team website

Nuxt 4 application serving the main BX Team website. Uses Vue 3, Tailwind CSS v4, and file-based routing.

## Architecture
Nuxt 4, **fully static** — the site is built with `nuxt generate` and deployed as Cloudflare Workers Static Assets (`wrangler.jsonc` + `worker.ts`, which only serves assets and the `200.html` SPA fallback). There is no runtime Nitro server. Content pages (docs, legal, landing) are prerendered; session/data-driven sections (`/dashboard`, `/admin`, `/downloads`, `/login`) are client-rendered (`ssr: false` route rules) and fetch everything from the `azimuth` API Worker at `https://api.bxteam.org` (see `app/lib/api.ts` — credentialed `api()` for `/auth`+`/pulsify`, plain fetch for public `/atlas`). Tailwind CSS for styling, shadcn-vue for UI components, Better Auth (client) for authentication against azimuth.

## Key Directories
- **`app/pages/`** — file-based routing
- **`app/components/`** — website-specific components (shadcn-vue)
- **`app/middleware/`** — route guards and auth checks
- **`app/layouts/`** — Nuxt layout components
- **`app/lib/`** — utility functions, API client (`api.ts`), auth client (`auth-client.ts`)
- **`app/assets/`** — static assets like images, fonts, and styles

## Components
We use shadcn-vue for UI components, which are located in `app/components/`. These components are designed to be reusable and customizable across the website.

When developing new pages or features, you can add new components from shadcn-vue using `bunx --bun shadcn-vue@latest add <component-name>` command. Don't create custom components unless necessary; prefer using shadcn-vue components for consistency.

## Responsive design

All pages and components must be fully responsive — usable on both desktop and mobile. Use Tailwind responsive prefixes (`sm:`, `md:`, `lg:`) to adapt layouts. Touch targets must be at least 44×44px. Never rely on hover-only interactions; ensure equivalent behaviour on touch screens.

## Running dev server
Don't start the dev server via Bash commands, user will run development server by himself. Just make sure to run `bun install` in the project root to install dependencies, and then the user can start the dev server with `bun --bun dev`.
