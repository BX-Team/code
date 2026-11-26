# apps/web — website and docs

Nuxt 4 on Vue 3 and Tailwind v4, built with `nuxt generate` and served as Cloudflare Workers Static Assets (`worker.ts` serves only assets and the `200.html` fallback). Content pages are prerendered; `/downloads` and `/tools` are client-rendered.

## Layout

- `app/pages/` — file-based routing; `app/components/` — components only this app uses.
- `app/config/projects.ts` — everything on the home and project pages; a project must be in `@bx-team/projects` first.
- `app/lib/` — the downloads client (`builds.ts`, typed by `hc<ApiContract>`), GitHub releases for desktop apps (`releases.ts`), the tools' logic.
- `content/docs/` — documentation; a section exists exactly when the registry says `docs: true`, or the build fails.
- `public/demo/<project>/` — WebAssembly demos, copied in by hand from the project's repository.

## Rules

- Every page is responsive: Tailwind breakpoints, 44×44 px touch targets, nothing hover-only.
- The top bar is `SiteNav.vue` over `@bx-team/ui`'s `Navbar` and the footer is `SiteFooter.vue`; no page builds its own.
- Docs use MDC block syntax (`::component` … `::`) only; numeric prefixes order the tree and renaming a file changes its URL.
- `lib/flags/` mirrors the `jvm-flags` skill in BX-Team/claude-skills: change both.
- The site never ships Mojang's assets.

## Development

Don't start the dev server: the user runs `bun dev` in this folder themselves. Run `bun install` at the repository root when dependencies change.

`bun run typecheck` runs Golar, the Vue checker for TypeScript 7. CI runs it without blocking until the site's existing errors are fixed.
