# code

The BX Team web platform in one repository: the `bxteam.org` site and its documentation,
the public downloads API, and the Discord bot that announces releases. TypeScript
throughout, a bun workspaces monorepo, and every deployable is a Cloudflare Worker —
there is no VPS, no Docker and no runtime Nitro server.

## Architecture

Three Workers, each on its own custom domain, and none of them calls another over an
internal boundary. `meridian` is a `nuxt generate` build served as Workers Static Assets;
its data-driven `/downloads` section is client-rendered and talks to `azimuth` over the
public API like any other consumer. `azimuth` owns all persistent state — the `atlas-db`
D1 database and the `builds` R2 bucket — and is the only place that writes it. `beacon`
has no storage at all: it learns that something was published from the `atlas-events`
queue, which `azimuth` produces onto and `beacon` consumes. That queue is the only
coupling between the two, and it is one-way: `azimuth` knows nothing about Discord.

The packages are consumed from source inside the workspace and are never published.

| Package | Responsibility |
| ------- | -------------- |
| `apps/meridian` | The website and documentation. Nuxt 4, Vue 3, Tailwind v4, fully static. |
| `apps/azimuth` | The public API on `api.bxteam.org`. Hono; the `/atlas` downloads group over D1 and R2. |
| `apps/beacon` | The Discord bot on `beacon.bxteam.org`. Hono; GitHub webhooks, slash commands, the `atlas-events` consumer. |
| `packages/stratus` | D1 schemas and migrations (Drizzle ORM). |
| `packages/types` | Shared Zod schemas for the Atlas wire format and the queue payloads. |
| `packages/ui` | Shared Vue 3 components and design tokens. |

Each has its own `CLAUDE.md` — [`apps/azimuth`](apps/azimuth/CLAUDE.md),
[`apps/beacon`](apps/beacon/CLAUDE.md), [`apps/meridian`](apps/meridian/CLAUDE.md),
[`packages/ui`](packages/ui/CLAUDE.md). Read the one you are about to edit; they hold the
rules that actually bite.

### Decisions that are settled

- **Everything runs on Cloudflare Workers.** No VPS, no Docker, no runtime Nitro server,
  no long-lived process. Anything needing a socket held open — a Discord gateway
  connection, a websocket, a background worker — is out of scope by construction.
- **Cloudflare builds and deploys from the repository.** There are deliberately no CI
  workflows here: every pull request gets a preview deployment and its build is the
  required check, so a workflow running the same install and build would only be a slower
  duplicate.
- **`azimuth` owns the data, the queue is the coupling.** Do not add a second writer to
  `atlas-db`, and do not give `beacon` storage. If `beacon` needs to know something, it
  arrives as a queue event or it comes from a public read.
- **Atlas versions are inserted by hand** as a D1 row from the Cloudflare dashboard, so
  `POST /projects/:project/versions/create` never actually runs. Anything that should
  happen "when a version appears" hangs off the first build in
  `apps/azimuth/src/routes/atlas/upload.ts` — that is why announcements go out on
  `version.released`.
- **Biome is the formatter and the linter.** Not ESLint, not Prettier, and not both.

## Commands

```bash
bun install                     # once, from the repository root
bun dev                         # every app in parallel
bun dev:meridian                # the site; the user starts this themselves
bun dev:azimuth                 # the API, on wrangler dev
bun dev:beacon                  # the bot, on wrangler dev
bun run build                   # build every app
bunx biome check .              # formatting and lint
bun run --filter '*' typecheck  # tsc / nuxt typecheck per app
```

Cloudflare runs the build of each app on every pull request and that is the only
automated check. Nothing runs Biome or `typecheck` for you — run both before committing,
because a formatting-only follow-up commit is noise and a type error only shows up as a
failed Cloudflare build minutes later.

## Code Guidelines

### Comments

- NO file-header banners and NO divider comments (`// --- helpers ---`). Group code with
  functions, not comment art.
- Add an inline comment only where the code is genuinely non-obvious — a real footgun, a
  wire-format quirk, a reason a thing is done backwards. Then keep it to a line or two.
- Don't narrate the obvious. If a comment restates the next line, delete it.
- Doc comments on public items are fine and should say *why*, in one or two sentences.

### Style

- Biome is the source of truth — never hand-format against it. Two-space indent for
  TS/JS/JSON and standalone CSS; tabs appear only inside `.vue` `<template>` and `<style>`
  blocks, because Biome does not reformat those.
- Match the surrounding code: follow the idiom already in the file you are editing.
- A component reusable outside one app belongs in `@bx-team/ui`, not in
  `apps/meridian/app/components/`.
- Anything crossing the wire — request bodies, query strings, queue payloads — is parsed
  through a Zod schema in `@bx-team/types`, never read off an untyped object.
- In `azimuth`, one error type and one error shape for the whole API (`util/error.ts`);
  handlers `throw`, they never hand-roll `try`/`catch` plus `c.json({ ok: false })`.

### Language of user-facing strings

English, everywhere — the site, the documentation pages, API error messages and Discord
embeds alike. There is no i18n layer and no locale files; a Russian string in a component
ships as-is to every reader.

### Content and platform gotchas

- **MDC block syntax only** in documentation pages: `::component` … `::`. The HTML-like
  `<Component />` form can swallow the content that follows it.
- **A docs icon has to be registered.** Frontmatter `icon:` takes a PascalCase
  [Lucide](https://lucide.dev/icons/) name, but icons are bundled explicitly — a new one
  must also be imported into `iconMap` in `app/layouts/docs.vue` or the sidebar silently
  falls back to `FileText`.
- **Numeric prefixes order the docs tree** (`01.getting-started/`) and are stripped from
  the URL. Renaming a file changes its URL; nothing redirects the old one.
- **D1 has no interactive transactions.** `db.batch()` is the atomic unit; anything wider
  needs an explicit compensating delete.
- **The Cache API is a no-op on `*.workers.dev`.** Edge-cache behaviour only shows up on
  the custom domain, so a "caching does not work" report from a preview URL is expected.
- **Discord interactions must be answered within 3 seconds**, and nothing here defers —
  a deferred reply would need the Worker to outlive its response.

### Testing

There are no test suites in this repository, and adding a framework is a decision to make
deliberately rather than in passing. What stands in for them: `bunx biome check .`, the
per-app `typecheck`, and walking the change through on the pull request's Cloudflare
preview deployment. Say in the pull request what you actually exercised.

## Bash Guidelines

- Don't pipe output through `head`/`tail`/`less` to truncate — use tool-native flags
  (`git log -n 10`, `bun run --filter @bx-team/azimuth typecheck`). Read the full output.
- Don't create scratch files (scripts, notes) unless asked.
- When given failures, just fix them — don't argue about who introduced them.
