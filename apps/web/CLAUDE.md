# apps/web - BX Team website

Nuxt 4 application serving the main BX Team website. Uses Vue 3, Tailwind CSS v4, and file-based routing.

## Architecture
Nuxt 4, **fully static** — the site is built with `nuxt generate` and deployed as Cloudflare Workers Static Assets (`wrangler.jsonc` + `worker.ts`, which only serves assets and the `200.html` SPA fallback). There is no runtime Nitro server and there are no user accounts. Content pages (docs, landing) are prerendered; the data-driven `/downloads` section is client-rendered (`ssr: false` route rules) and reads the downloads API (`apps/api`) at `https://api.bxteam.org/v1` — `API_BASE` and every call live in `app/lib/builds.ts`, typed through `hc<ApiContract>` from `@bx-team/types/api`. In dev a Nitro `devProxy` maps `/v1` onto it, so the browser stays same-origin. The exception is a desktop app published only as GitHub releases (`githubReleases: true` in `app/config/projects.ts` — Riven, Nyx): `/downloads` and `/downloads/<slug>` read its releases from the GitHub REST API in the browser (`app/lib/releases.ts`, parsed with `RestReleaseListSchema` from `@bx-team/types/schema/github`) and sort the assets into Windows, macOS, Linux and command line by file name. Nothing is mirrored into `api`; a new asset naming scheme needs a line in `classify`. In dev those requests go through the `/gh` dev proxy, which adds `GITHUB_TOKEN` from `apps/web/.env`; the token never reaches the browser. Tailwind CSS for styling.

**Nuxt 5 defaults are on** (`future.compatibilityVersion: 5` on Nuxt 4.6): typed pages and `$fetch` (auto-imported from `#build/fetch`, no longer a browser global), case-sensitive routes, payloads inlined into prerendered HTML. `experimental.nitroAutoImports: true` stays until `@nuxt/content` stops importing `useRuntimeConfig` from `#imports` in its server routes — without it the prerender fails with `"useRuntimeConfig" is not exported by "virtual:#imports"`. Take it out when Content supports Nuxt 5.

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
The home page is a centred hero card over `HomeHeroBeams` (columns of light in the accent gradient, breathing by CSS transforms; still under reduced motion — `HomeHeroHorizon`, a perspective grid floor drawn as SVG lines, is the kept alternative), then the projects laid out by each one's `home` field in `app/config/projects.ts` — the wide `HomeFlagshipCard` (median tick time against Paper and Purpur from `app/config/benchmarks.ts`, its latest build fetched in the browser), `HomeShowcaseCard`s showing the first preview — or, with no previews, the project's `terminal` lines (Riven, Nyx) — and `HomeTileCard`s — and `components/home/CommunityBand.vue` (Discord
and GitHub, with contributors from `useContributors`, which the team page shares and which is fetched at prerender); each card opens `/<slug>` (`app/pages/[project].vue`), a page with the project's hero, previews, features, get-started cards and — for DivineMC — the benchmark results (`app/config/benchmarks.ts`). Everything on those pages comes from `app/config/projects.ts`; add a project there and it appears on the home page, in the footer and at its own URL. Its slug, name, repository and docs link come from `@bx-team/projects` through `site('<key>')`, so a project has to be in the registry first. The build also fails when a `content/docs/<key>` section and the registry's `docs: true` disagree. A slug must not collide with a top-level route (`docs`, `downloads`, `tools`, `team`). Screenshots go in `public/projects/<slug>/` and into the project's `previews` list; the preview section hides itself while the list is empty.

The home cards draw each project's own pixel logo (`lib/marks.ts`, through `HomeProjectMark`): the 16×16 SVG from the project's `.github/branding/`, with its colours swapped for site tokens. A project without one falls back to the 8×8 glyph in `TileCard`.

A project with a `demo` gets a "Live demo" section instead (`components/ProjectDemo.vue`): a poster until the visitor clicks, then an iframe running the app's own interface compiled to WebAssembly, scaled down on narrow screens and hidden below 768 px, where a desktop interface is unusable. Riven's is `crates/riven-demo` in the Riven repository; its `build-web.sh` writes `dist/`, and `riven_demo.js` with `riven_demo_bg.wasm` are copied into `public/demo/riven/` by hand after a change there (Biome ignores that folder). The iframe's document comes from `lib/demo.ts` as `srcdoc`, not from a file in `public/` — the worker sends extensionless paths to the SPA shell and Workers assets redirect `/index.html`, either of which breaks a demo page's relative imports.

Shared components come from `@bx-team/ui` — see [`packages/ui/CLAUDE.md`](../../packages/ui/CLAUDE.md). Add a page-specific component under `app/components/` only when it has no reuse outside this app; anything reusable belongs in `@bx-team/ui`.

## Tools
`/tools` lists the utilities and the Claude skills; each tool is `app/pages/tools/<name>.vue` inside `ToolsToolPage`, which also carries the shared form styles (`.panel`, `.input`, `.chip`, `.btn`, …). The tool pages are client-rendered (`'/tools/*': { ssr: false }`) because every form lives in the query string (`lib/query.ts`) so a result can be pasted into a support thread.

- **Server flags** — `lib/flags/` (the script highlighter is `lib/flags/highlight.ts`), the same sets and conditions as the `jvm-flags` skill (`skills/jvm-flags/reference/presets.md` in [BX-Team/claude-skills](https://github.com/BX-Team/claude-skills)). Change one, change the other.
- **UUID** — `lib/mojang.ts`. Mojang answers a Cloudflare Worker with 403 and sends a browser no CORS headers, so the browser asks crafthead.net, then playerdb.co; the offline UUID is computed locally. Do not move the lookup into `api`.
- **Colour text** and **coordinates** are pure computation (`lib/colortext.ts`, the page itself). The colour text previews (`ToolsMcPreview`) draw Minecraft's screens without Mojang's assets: the backdrops are pixel SVGs generated in `lib/mcscene.ts`, the font is Monocraft (OFL, subset to Latin and Cyrillic in `public/fonts/monocraft/`). Do not add textures or screenshots from the game.

The skills live in [BX-Team/claude-skills](https://github.com/BX-Team/claude-skills), which is also the Claude Code marketplace (plugin `minecraft-server`). The "zip" button builds the archive claude.ai expects in the browser (`lib/skills.ts`): it lists `skills/<name>/` in that repository's `master` tree through the GitHub API and reads each file from raw.githubusercontent.com, so there is no copy to keep in sync, and renaming a skill folder there breaks its button here.

## Responsive design

All pages and components must be fully responsive — usable on both desktop and mobile. Use Tailwind responsive prefixes (`sm:`, `md:`, `lg:`) to adapt layouts. Touch targets must be at least 44×44px. Never rely on hover-only interactions; ensure equivalent behaviour on touch screens.

## Running dev server
Don't start the dev server via Bash commands, user will run development server by himself. Just make sure to run `bun install` in the project root to install dependencies, and then the user can start the dev server with `bun --bun dev`.
