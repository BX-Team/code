# code

The BX Team web platform: the `bxteam.org` site and its documentation, the downloads API behind it, and the bot that runs releases on GitHub and announces them in Discord. TypeScript in a bun workspaces monorepo; every deployable is a Cloudflare Worker.

## Architecture

| Package | Responsibility |
| ------- | -------------- |
| `apps/web` | The website and documentation. Nuxt 4, Vue 3, Tailwind v4, fully static. |
| `apps/api` | The downloads API on `api.bxteam.org`. Hono; D1, R2, publish tokens. |
| `apps/bot` | The GitHub App and Discord bot on `bot.bxteam.org`. Hono; release PRs, release commands, board, announcements. |
| `packages/projects` | The project registry: key, name, repository, docs, Discord thread, release setup. |
| `packages/types` | Shared Zod schemas and the downloads API contract (`@bx-team/types/api`). |
| `packages/ui` | Shared Vue 3 components and design tokens. |
| `packages/worker` | What every Worker shares: the error type and handlers, hex, HMAC signatures. |

- Everything runs on Cloudflare Workers: no VPS, no Docker, no runtime Nitro server, nothing that holds a socket open.
- `api` is the only app with storage; `web` and `bot` read it through `hc<ApiContract>`.
- A project is declared once, in `@bx-team/projects`; its downloads are a row in `api`'s D1 under the same key.
- Packages are consumed from source inside the workspace and never published. Code lives on GitHub; nothing here builds project artifacts.

## Commands

```bash
bun install                     # once, from the repository root
bun dev:api                     # the downloads API, on wrangler dev
bun dev:bot                     # the bot, on wrangler dev
bun run build                   # build every app
bunx biome check .              # formatting and lint
bun run --filter '*' typecheck  # tsc / nuxt typecheck per app
```

Cloudflare builds every app on each pull request, and that build is the only automated check: run Biome and `typecheck` yourself before committing. The user starts the site's dev server (`bun dev:web`) themselves.

## Working on Tasks

- If the message is a question, investigate and answer only. Edit files only when asked to fix or implement.
- Stay within the scope of the request. Mention related problems you notice instead of fixing them.
- Fix the cause, not the symptom. No special-case constants or hardcoded lists to make one case work.
- When a change can't be verified without running the app, say so.
- Trust the user's reports about what they observed in the running app.
- Don't edit `CLAUDE.md` or `AGENTS.md` unless asked. Decisions, plans and progress don't belong in them.

## Code Guidelines

### Comments

- NO file-header banners and NO divider comments (`// --- helpers ---`).
- Avoid inline comments. Add one only where the code is genuinely non-obvious: a footgun, a wire-format quirk, a reason a thing is done backwards. One line, two at most.
- Why a thing is done this way, or the trap it avoids, is that one short comment at the code, not a paragraph and not an entry here.
- Doc comments on public items are fine; keep them to a sentence.

### Style

- Biome is the formatter and the linter — never hand-format against it. Two-space indent; tabs only inside `.vue` `<template>` and `<style>`.
- Match the surrounding code: follow the idiom already in the file you are editing.
- A component reusable outside one app belongs in `@bx-team/ui`.
- Anything crossing the wire — bodies, query strings, webhook payloads — is parsed through a Zod schema in `@bx-team/types`.
- One error type and shape for every Worker (`@bx-team/worker/error`): handlers `throw`, never `try`/`catch` plus `c.json({ ok: false })`.

### User-facing strings

English, everywhere: the site, the docs, API errors and Discord embeds. There is no i18n layer.

### Testing

No test suites; adding a framework is a deliberate decision. Biome, `typecheck` and the pull request's preview deployment stand in: say in the pull request what you exercised.

## Bash Guidelines

- Don't pipe output through `head`/`tail`/`less` to truncate — use tool-native flags (`git log -n 10`, `bun run --filter @bx-team/bot typecheck`). Read the full output.
- Don't create scratch files (scripts, notes) unless asked.
- When given failures, just fix them — don't argue about who introduced them.

## Subprojects

- [`apps/api/CLAUDE.md`](apps/api/CLAUDE.md) — downloads API
- [`apps/bot/CLAUDE.md`](apps/bot/CLAUDE.md) — GitHub App and Discord bot
- [`apps/web/CLAUDE.md`](apps/web/CLAUDE.md) — website and docs
- [`packages/ui/CLAUDE.md`](packages/ui/CLAUDE.md) — shared components and tokens
