# apps/web - BX Team website

Nuxt 4 application serving the main BX Team website. Uses Vue 3, Tailwind CSS v4, and file-based routing.

## Architecture
Nuxt 4, **fully static** — the site is built with `nuxt generate` and deployed as Cloudflare Workers Static Assets (`wrangler.jsonc` + `worker.ts`, which only serves assets and the `200.html` SPA fallback). There is no runtime Nitro server and there are no user accounts. Content pages (docs, landing) are prerendered; the data-driven `/downloads` section is client-rendered (`ssr: false` route rules) and reads the downloads API (`apps/api`) at `https://api.bxteam.org/v1` — `API_BASE` and every call live in `app/lib/builds.ts`, typed through `hc<ApiContract>` from `@bx-team/types/api`. In dev a Nitro `devProxy` maps `/v1` onto it, so the browser stays same-origin. Tailwind CSS for styling.

## Key Directories
- **`app/pages/`** — file-based routing
- **`app/components/`** — website-specific components
- **`app/layouts/`** — Nuxt layout components
- **`app/lib/`** — the downloads client (`builds.ts`), the release-notes renderer (`markdown.ts`) and the size/date formatters (`format.ts`)
- **`app/assets/`** — static assets like images, fonts, and styles

## Components
The top bar is `app/components/SiteNav.vue` — a thin wrapper over `@bx-team/ui`'s `Navbar` that supplies the links, the GitHub and Discord icons and `NuxtLink`. Every section renders it (landing, team, downloads through `PageShell`, the docs layout); none of them builds a bar of its own.

The footer is `app/components/SiteFooter.vue`, which supplies `@bx-team/ui`'s `Footer` with its link columns; `PageShell` and the standalone pages (home, project pages) render it.

## Projects
The home page is the pixel-field `Hero` and a grid of `ProjectCard`s; each card opens `/<slug>` (`app/pages/[project].vue`), a page with the project's hero, previews, features, get-started cards and — for DivineMC — the benchmark results (`app/config/benchmarks.ts`). Everything on those pages comes from `app/config/projects.ts`; add a project there and it appears on the home page, in the footer and at its own URL. Its slug, name, repository and docs link come from `@bx-team/projects` through `site('<key>')`, so a project has to be in the registry first. The build also fails when a `content/docs/<key>` section and the registry's `docs: true` disagree. A slug must not collide with a top-level route (`docs`, `downloads`, `team`). Screenshots go in `public/projects/<slug>/` and into the project's `previews` list; the preview section hides itself while the list is empty.

Shared components come from `@bx-team/ui` — see [`packages/ui/CLAUDE.md`](../../packages/ui/CLAUDE.md). Add a page-specific component under `app/components/` only when it has no reuse outside this app; anything reusable belongs in `@bx-team/ui`.

## Responsive design

All pages and components must be fully responsive — usable on both desktop and mobile. Use Tailwind responsive prefixes (`sm:`, `md:`, `lg:`) to adapt layouts. Touch targets must be at least 44×44px. Never rely on hover-only interactions; ensure equivalent behaviour on touch screens.

## Running dev server
Don't start the dev server via Bash commands, user will run development server by himself. Just make sure to run `bun install` in the project root to install dependencies, and then the user can start the dev server with `bun --bun dev`.
