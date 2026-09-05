# code

The BX Team web platform in one repository: the `bxteam.org` site and its documentation,
the downloads API behind it, and the Discord bot that announces releases. TypeScript
throughout, a bun workspaces monorepo, and every deployable is a Cloudflare Worker —
there is no VPS, no Docker and no runtime Nitro server.

## Architecture

Three Workers, each on its own custom domain. `azimuth` is the only one with storage: it
owns every project, version, build, release and artifact, on D1 and R2. `meridian` is a
`nuxt generate` build served as Workers Static Assets; its `/downloads` section is
client-rendered and reads azimuth's public JSON API at `https://api.bxteam.org/v1` like
any other consumer. `beacon` has no storage at all: it learns that something happened
from a webhook — GitHub's organisation webhook, or azimuth's after a publish — and
answers Discord interactions.

**Code lives on GitHub.** Repositories, pull requests and issues are in the
[BX-Team](https://github.com/BX-Team) organisation, and a release workflow in a project's
own repository is what publishes into azimuth. Nothing here hosts git.

The packages are consumed from source inside the workspace and are never published.

| Package | Responsibility |
| ------- | -------------- |
| `apps/meridian` | The website and documentation. Nuxt 4, Vue 3, Tailwind v4, fully static. |
| `apps/azimuth` | The downloads API on `api.bxteam.org`. Hono; D1, R2, publish tokens. |
| `apps/beacon` | The Discord bot on `beacon.bxteam.org`. Hono; GitHub and publish webhooks, slash commands. |
| `packages/types` | Shared Zod schemas for the downloads API and the publish notification. |
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
- **azimuth owns the data, and it is the only app that may.** meridian and beacon are
  read-only consumers of `api.bxteam.org/v1`; do not give either of them storage.
- **Nothing in this repository builds anything.** An artifact is produced by a release
  workflow in the project's own repository and uploaded through azimuth's publish
  endpoints with a project token. See [`apps/azimuth/CLAUDE.md`](apps/azimuth/CLAUDE.md).
- **A build number comes from the API, not from the CI run.** A workflow asks
  `/v1/publish/next/{project}/{version}` before it builds, so a failed run does not leave
  a gap in the published sequence.
- **Biome is the formatter and the linter.** Not ESLint, not Prettier, and not both.

## Commands

```bash
bun install                     # once, from the repository root
bun dev                         # every app in parallel
bun dev:meridian                # the site; the user starts this themselves
bun dev:beacon                  # the bot, on wrangler dev
bun dev:azimuth                 # the downloads API, on wrangler dev
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
- Anything crossing the wire — request bodies, query strings, webhook payloads — is
  parsed through a Zod schema in `@bx-team/types`, never read off an untyped object.
- In `beacon`, one error type and one error shape for the whole Worker (`util/error.ts`);
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
- **A webhook body is verified before it is parsed**, on the raw bytes: GitHub signs
  `X-Hub-Signature-256` and azimuth signs `X-Azimuth-Signature`, both `sha256=<hex>`
  HMACs.
- **Discord interactions must be answered within 3 seconds**, and nothing here defers —
  a deferred reply would need the Worker to outlive its response.

### Testing

There are no test suites in this repository, and adding a framework is a decision to make
deliberately rather than in passing. What stands in for them: `bunx biome check .`, the
per-app `typecheck`, and walking the change through on the pull request's Cloudflare
preview deployment. Say in the pull request what you actually exercised.

## Bash Guidelines

- Don't pipe output through `head`/`tail`/`less` to truncate — use tool-native flags
  (`git log -n 10`, `bun run --filter @bx-team/beacon typecheck`). Read the full output.
- Don't create scratch files (scripts, notes) unless asked.
- When given failures, just fix them — don't argue about who introduced them.
