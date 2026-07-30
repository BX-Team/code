# BX Team Monorepo

This is the BX Team monorepo — it contains all BX Team projects, both frontend and backend. When entering a project, either to edit or analyse, you should read it's CLAUDE.md.

`ARCHITECTURE.md` at the repo root is the authoritative specification: data model, wire format, endpoint inventory, business invariants and the phased rewrite plan. Read the relevant section before changing backend behaviour.

## Architecture
- **Backend:** Rust, one Cargo workspace (`Cargo.toml` with `members`). Three services on a single NixOS VPS behind nginx: `azimuth` (application API, api.bxteam.org), `influx` (ingest gateway, ingest.bxteam.org), `cinder` (queue consumer + scheduler). Storage: one PostgreSQL database `bx_team` with schemas `auth`/`atlas`/`pulsify`, ClickHouse for analytics, R2 (S3 API) for artifacts and error payloads.
- **Frontend:** Vue 3 / Nuxt 4 (fully static via `nuxt generate`), Tailwind CSS v4, deployed to Cloudflare Workers Static Assets. Managed with [bun workspaces](https://bun.sh/docs/pm/workspaces) — only `apps/meridian` and `packages/ui` are bun workspaces.
- **Formatting:** `rustfmt` for Rust, [Biome](https://biomejs.dev) for TS/JS/JSON/CSS — 2-space indent. Tabs are used only inside `.vue` `<template>` and `<style>` blocks (Biome doesn't reformat those). Run `cargo fmt --all` and `bunx biome check .` before committing.

### Apps (`apps/`)
| App               | Description                                                              |
| ----------------- | ------------------------------------------------------------------------ |
| `azimuth`         | Application API (axum): `/auth`, `/atlas`, `/pulsify`                    |
| `cinder`          | Ingest queue consumer + scheduler (alerts, spikes, session sweeping)      |
| `influx`          | Ingest gateway (axum), producer for the Postgres ingest queue             |
| `meridian`        | Main BX Team frontend (Nuxt 4, static, Workers Static Assets)             |

### Packages (`packages/`)
| Package     | Description                                           |
| ----------- | ----------------------------------------------------- |
| `analytics` | ClickHouse schema and typed queries                   |
| `database`  | PostgreSQL migrations, models, queue                  |
| `geoip`     | IPinfo Lite mmdb lookups                              |
| `mail`      | SMTP delivery and email templates                     |
| `storage`   | S3/R2 object storage                                  |
| `types`     | Wire format, fingerprint, scrub, versions, build info |
| `ui`        | Shared UI components (Vue 3, Tailwind)                |
| `util`      | Errors, extractors, CORS, rate limit, tracing         |

## Project-Specific Instructions
Each project may have its own `CLAUDE.md` with detailed instructions:

- [`apps/meridian/CLAUDE.md`](apps/meridian/CLAUDE.md) - Frontend Website
- [`packages/ui/CLAUDE.md`](packages/ui/CLAUDE.md) - Shared UI components

## Code Guidelines

### Comments
Comments are rare by rule, not by taste.

- Never document build files (`Cargo.toml`, `Dockerfile`, `build.rs`, `flake.nix`), CI workflows, config files (`biome.json`, `rustfmt.toml`) or Nix modules.
- NO file-header banner comments and NO "heading"/divider comments like `// --- helpers ---` or etc. Group code with functions, not comment art.
- Avoid inline `//` comments. Add one only when the code is correct but looks wrong — a wire-format quirk, a migration ordering constraint, a platform limit, a deliberately odd decision. Then keep it to a line or two.
- Doc comments on exported identifiers are expected, but keep them to a single line describing intent. Code should read for itself.
- Don't narrate the obvious (`// loop over nodes`). If a comment restates the next line, delete it.

### Rust
- Dependencies are declared once in `[workspace.dependencies]`; crates pull them in with `foo = { workspace = true }`.
- `models/` (API contract) and `database/models/` (table rows and their queries) are separate — never merge them.
- Authentication and ownership are extractors (`Session`, `AdminSession`, `OwnedProject`), never a check copied into a handler body.
- No string-concatenated SQL anywhere, including ClickHouse — bind parameters only.
- One error type per service with `IntoResponse`, one error shape for the whole API.
- OpenAPI is generated from handlers via `utoipa`, never written by hand.
- Anything with arithmetic or a wire contract gets a test: fingerprint parity vectors, version comparison, issue lifecycle, quotas, scrubbing, SDK batch deserialization.

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
- Commit titles follow Conventional Commits — the changelog generator parses them
- When provided problems, do not say "I didn't introduce these problems" (shifting the blame/effort) - just fix them.
