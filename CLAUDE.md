# BX Team Monorepo

This is the BX Team monorepo — it contains the BX Team web platform, frontend and backend. When entering a project, either to edit or analyse, you should read it's CLAUDE.md.

## Architecture
- **Monorepo tooling:** [bun workspaces](https://bun.sh/docs/pm/workspaces) (`package.json` with `workspaces` field). Run scripts across packages with `bun run --filter '<pattern>' <script>`.
- **Everything runs on Cloudflare Workers.** `meridian` is a fully static `nuxt generate` build served as Workers Static Assets; `azimuth` is a Hono Worker backed by one D1 database (`atlas-db`) and one R2 bucket (`builds`); `beacon` is a Hono Worker with no storage of its own. There is no runtime Nitro server, no VPS and no Docker.
- **Announcements:** azimuth produces onto the `atlas-events` queue and beacon consumes it. The queue is the only coupling between them — azimuth knows nothing about Discord.
- **Deployment:** Cloudflare builds and deploys the Workers straight from the repository. There are no CI workflows in this repo.
- **Formatting:** [Biome](https://biomejs.dev) is the source of truth — 2-space indent for TS/JS/JSON and standalone CSS. Tabs are used only inside `.vue` `<template>` and `<style>` blocks (Biome doesn't reformat those). Run `bunx biome check .` before committing.

### Apps (`apps/`)
| App               | Description                                        |
| ----------------- | -------------------------------------------------- |
| `azimuth`         | Public API (Hono): the `/atlas` downloads group     |
| `beacon`          | Discord bot (Hono): GitHub and Atlas announcements  |
| `meridian`        | Main BX Team frontend app (Nuxt 4, static)          |

### Packages (`packages/`)
| Package           | Description                                |
| ----------------- | ------------------------------------------ |
| `stratus`         | D1 schemas and migrations (Drizzle ORM)    |
| `types`           | Shared Zod schemas for the Atlas wire format and the `atlas-events` queue |
| `ui`              | Shared UI components (Vue 3, Tailwind)     |

## Project-Specific Instructions
Each project may have its own `CLAUDE.md` with detailed instructions:

- [`apps/azimuth/CLAUDE.md`](apps/azimuth/CLAUDE.md) - Public API Worker
- [`apps/beacon/CLAUDE.md`](apps/beacon/CLAUDE.md) - Discord bot Worker
- [`apps/meridian/CLAUDE.md`](apps/meridian/CLAUDE.md) - Frontend Website
- [`packages/ui/CLAUDE.md`](packages/ui/CLAUDE.md) - Shared UI components

## Code Guidelines

### Comments
- DO NOT use "heading" comments like: `=== Helper methods ===`.
- Use doc comments, but avoid inline comments unless ABSOLUTELY necessary for clarity. Code should aim to be self documenting!

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
