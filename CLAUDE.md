# BX Team Monorepo

This is the BX Team monorepo — it contains all BX Team projects, both frontend and backend. When entering a project, either to edit or analyse, you should read it's CLAUDE.md.

## Architecture
- **Monorepo tooling:** [Turborepo](https://turbo.build) (`turbo.json`) + [bun workspaces](https://bun.sh/docs/pm/workspaces) (`package.json` with `workspaces` field)
- **Frontend:** Vue 3 / Nuxt 4, Tailwind CSS v4
- **Backend:** Hono (Ingest API), Nuxt Nitro (Downloads API, Auth, Pulsify API), Postgres, Clickhouse
- **Indentation:** Use TAB everywhere, never spaces

### Apps (`apps/`)
| App               | Description                        |
| ----------------- | -----------------------------------|
| `cinder`          | BullMQ worker for ingest API       |
| `influx`          | Ingest API written in Hono         |              
| `meridian`        | Main BX Team frontend app (Nuxt 4) |
| `zenith`          | Status monitor (like Better Uptime)|

### Packages (`packages/`)
| Package           | Description                           |
| ----------------- | --------------------------------------|
| `stratus`         | Database schemas (Drizzle ORM)        |
| `types`           | Shared TypeScript types (Zod schemas) |
| `ui`              | Shared UI components (Vue 3, Tailwind) |

## Project-Specific Instructions
Each project may have its own `CLAUDE.md` with detailed instructions:

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
