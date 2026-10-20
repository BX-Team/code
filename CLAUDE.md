# code

The BX Team web platform in one repository: the `bxteam.org` site and its documentation,
the downloads API behind it, and the bot that runs releases on GitHub and announces them
in Discord. TypeScript
throughout, a bun workspaces monorepo, and every deployable is a Cloudflare Worker —
there is no VPS, no Docker and no runtime Nitro server.

## Architecture

Three Workers, each on its own custom domain. `api` is the only one with storage: it
owns every project, version, build, release and artifact, on D1 and R2. `web` is a
`nuxt generate` build served as Workers Static Assets; its `/downloads` section is
client-rendered and reads `api`'s public JSON API at `https://api.bxteam.org/v1` like
any other consumer. `bot` has no storage at all: it is both the BX Team GitHub App and
the Discord bot. It learns that something happened from a webhook — the GitHub App's, or
`api`'s after a publish — acts on the repositories (release PRs, release commands, the
organisation board, pull request titles), announces in Discord and answers Discord
interactions.

**Code lives on GitHub.** Repositories, pull requests and issues are in the
[BX-Team](https://github.com/BX-Team) organisation, and a release workflow in a project's
own repository is what publishes into `api`. Nothing here hosts git.

The packages are consumed from source inside the workspace and are never published.

| Package | Responsibility |
| ------- | -------------- |
| `apps/web` | The website and documentation. Nuxt 4, Vue 3, Tailwind v4, fully static. |
| `apps/api` | The downloads API on `api.bxteam.org`. Hono; D1, R2, publish tokens. |
| `apps/bot` | The GitHub App and Discord bot on `bot.bxteam.org`. Hono; release PRs, `/release` commands, board, title check, announcements, slash commands. |
| `packages/projects` | The project registry: key, name, repository, docs, Discord thread, release setup. |
| `packages/types` | Shared Zod schemas for the downloads API, the publish notification and GitHub webhooks. |
| `packages/ui` | Shared Vue 3 components and design tokens. |
| `packages/worker` | What every Worker shares: the error type and handlers, hex, `sha256=` HMAC signatures. |

Each has its own `CLAUDE.md` — [`apps/api`](apps/api/CLAUDE.md),
[`apps/bot`](apps/bot/CLAUDE.md), [`apps/web`](apps/web/CLAUDE.md),
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
- **`api` owns the data, and it is the only app that may.** `web` and `bot`
  are read-only consumers of `api.bxteam.org/v1`; do not give either of them storage.
- **Nothing in this repository builds anything.** An artifact is produced by a release
  workflow in the project's own repository and uploaded through `api`'s publish
  endpoints with a project token. See [`apps/api/CLAUDE.md`](apps/api/CLAUDE.md).
- **A project is declared once, in `@bx-team/projects`.** The site's project pages, the
  docs sections, the bot's release PRs, Discord threads and `/docs` command all read it;
  the web build fails when a docs section and the registry disagree. Its downloads are
  still a row in `api`'s D1 — the key is what ties the two together.
- **A build number comes from the API, not from the CI run.** A workflow asks
  `/v1/publish/next/{project}/{version}` before it builds, so a failed run does not leave
  a gap in the published sequence.
- **Biome is the formatter and the linter.** Not ESLint, not Prettier, and not both.

## Commands

```bash
bun install                     # once, from the repository root
bun dev                         # every app in parallel
bun dev:web                     # the site; the user starts this themselves
bun dev:api                     # the downloads API, on wrangler dev
bun dev:bot                     # the GitHub App and Discord bot, on wrangler dev
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
  `apps/web/app/components/`.
- Anything crossing the wire — request bodies, query strings, webhook payloads — is
  parsed through a Zod schema in `@bx-team/types`, never read off an untyped object.
- One error type and one error shape for every Worker (`@bx-team/worker/error`);
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
  `X-Hub-Signature-256` and `api` signs `X-Api-Signature`, both `sha256=<hex>`
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
  (`git log -n 10`, `bun run --filter @bx-team/bot typecheck`). Read the full output.
- Don't create scratch files (scripts, notes) unless asked.
- When given failures, just fix them — don't argue about who introduced them.
