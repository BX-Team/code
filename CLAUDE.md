# BX Team Monorepo

This is the BX Team monorepo — it contains all BX Team projects, both frontend and backend. When entering a project, either to edit or analyse, you should read it's CLAUDE.md.

## Architecture
- **Monorepo tooling:** [bun workspaces](https://bun.sh/docs/pm/workspaces) (`package.json` with `workspaces` field). Run scripts across packages with `bun run --filter '<pattern>' <script>`.
- **Frontend:** Vue 3 / Nuxt 4 (fully static via `nuxt generate`), Tailwind CSS v4
- **Backend:** Everything runs on Cloudflare Workers — Hono APIs (`influx` ingest gateway at ingest.bxteam.org, `azimuth` application API at api.bxteam.org), a Queues consumer (`cinder`), D1 (three databases: `auth-db`, `atlas-db`, `pulsify-db`), Workers Analytics Engine, R2, KV, Durable Objects
- **Formatting:** [Biome](https://biomejs.dev) is the source of truth — 2-space indent for TS/JS/JSON and standalone CSS. Tabs are used only inside `.vue` `<template>` and `<style>` blocks (Biome doesn't reformat those). Run `bunx biome check .` before committing.

### Apps (`apps/`)
| App               | Description                                                              |
| ----------------- | ------------------------------------------------------------------------ |
| `azimuth`         | Application API Worker (Hono): `/auth`, `/atlas`, `/pulsify`             |
| `cinder`          | Queue consumer Worker for the ingest pipeline (+ cron alerts, session DO) |
| `influx`          | Ingest API Worker (Hono), producer for the `pulsify-ingest` Queue        |
| `meridian`        | Main BX Team frontend (Nuxt 4, static, Workers Static Assets)            |

### Packages (`packages/`)
| Package           | Description                           |
| ----------------- | --------------------------------------|
| `stratus`         | D1 database schemas (Drizzle ORM, sqlite-core) |
| `types`           | Shared TypeScript types (Zod schemas) |
| `ui`              | Shared UI components (Vue 3, Tailwind) |

## Project-Specific Instructions
Each project may have its own `CLAUDE.md` with detailed instructions:

- [`apps/meridian/CLAUDE.md`](apps/meridian/CLAUDE.md) - Frontend Website
- [`packages/ui/CLAUDE.md`](packages/ui/CLAUDE.md) - Shared UI components

## Code Guidelines

### Comments
- NO file-header banner comments and NO "heading"/divider comments like `// --- helpers ---` or etc. Group code with functions, not comment art.
- Avoid inline `//` comments. Add one only when the code is genuinely non-obvious (a real footgun) — e.g. a wire-format quirk, a subtle SQL/migration ordering constraint, a device-limit edge case. Then keep it to a line or two.
- Doc comments on exported identifiers are expected, but keep them to a single line describing intent. Code should read for itself.
- Don't narrate the obvious (`// loop over nodes`). If a comment restates the next line, delete it.
- Keep every comment as short as possible — the fewest words that convey the non-obvious bit. Prefer one line; never write a paragraph where a clause will do.

## Bash Guidelines

### Output handling
- DO NOT pipe output through `head`, `tail`, `less`, or `more`
- NEVER use `| head -n X` or `| tail -n X` to truncate output
- IMPORTANT: Run commands directly without pipes when possible
- IMPORTANT: If you need to limit output, use command-specific flags (e.g. `git log -n 10` instead of `git log | head -10`)
- ALWAYS read the full output — never pipe through filters

### General
- Do not create new non-source code files (e.g. Bash scripts, SQL scripts) unless explicitly prompted to
- For Frontend, when doing lint checks, always use Biome (e.g. `biome check .`) instead of ESLint or other linters
- When provided problems, do not say "I didn't introduce these problems" (shifting the blame/effort) - just fix them.
