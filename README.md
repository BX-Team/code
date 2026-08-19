<div align="center">

# code

The BX Team web platform in one repository — the site and documentation at
[bxteam.org](https://bxteam.org), the downloads API behind every build we publish, and
the Discord bot that announces them. TypeScript end to end, running entirely on
Cloudflare Workers.

[![Chat on Discord](https://cdn.jsdelivr.net/npm/@intergrav/devins-badges@3/assets/cozy/social/discord-plural_vector.svg)](https://discord.gg/qNyybSSPm5)
[![documentation](https://cdn.jsdelivr.net/npm/@intergrav/devins-badges@3/assets/cozy/documentation/website_vector.svg)](https://bxteam.org)
[![github](https://cdn.jsdelivr.net/npm/@intergrav/devins-badges@3/assets/cozy/available/github_vector.svg)](https://github.com/BX-Team/code)

</div>

BX Team is an open source community building tools for Minecraft server owners,
developers and players. The plugins and server software live in their own repositories
across the [organization](https://github.com/BX-Team); this one holds the web platform
that ties them together. If you only want to *use* our projects, start at
[bxteam.org](https://bxteam.org).

## 📂 What is in here

A [bun workspaces](https://bun.sh/docs/pm/workspaces) monorepo. Each app is a Cloudflare
Worker deployed on its own domain; the packages are consumed from source, never published.

| App | Domain | What it is |
| --- | ------ | ---------- |
| [`apps/meridian`](apps/meridian) | `bxteam.org` | The website and documentation — Nuxt 4, statically generated and served as Workers Static Assets |
| [`apps/azimuth`](apps/azimuth) | `api.bxteam.org` | The public API — Hono, the `/atlas` downloads group over D1 and R2 |
| [`apps/beacon`](apps/beacon) | `beacon.bxteam.org` | The Discord bot — Hono, GitHub webhooks and Atlas announcements |

| Package | What it is |
| ------- | ---------- |
| [`packages/stratus`](packages/stratus) | D1 schemas and migrations (Drizzle ORM) |
| [`packages/types`](packages/types) | Shared Zod schemas for the Atlas wire format and the `atlas-events` queue |
| [`packages/ui`](packages/ui) | Shared Vue 3 components and design tokens |

All persistent state belongs to `azimuth`: the `atlas-db`
[D1](https://developers.cloudflare.com/d1/) database for project, version and build
metadata, and the `builds` [R2](https://developers.cloudflare.com/r2/) bucket for the
artifacts. `beacon` stores nothing — it learns about a release from the `atlas-events`
queue.

## 🚀 Getting started

You need [Bun](https://bun.sh); the version is pinned in `package.json`. Install once from
the repository root:

```bash
bun install
```

Then run whichever app you are working on:

```bash
bun dev             # everything in parallel
bun dev:meridian    # the site, on nuxt dev
bun dev:azimuth     # the API, on wrangler dev
bun dev:beacon      # the bot, on wrangler dev
```

The two Workers read local secrets from a `.dev.vars` — copy the `.dev.vars.example` next
to each of them as a starting point. Per-app notes live in each project's `CLAUDE.md`.

## 🧪 API

`azimuth` serves `https://api.bxteam.org`. Reads are public and need no credentials; the
OpenAPI document is at [`/openapi.json`](https://api.bxteam.org/openapi.json) and the
rendered reference at [`/reference`](https://api.bxteam.org/reference).

## 🔨 Build from source

```bash
bun run build       # every app
bun build:meridian  # nuxt generate
bun build:azimuth   # wrangler deploy --dry-run
bun build:beacon    # wrangler deploy --dry-run
bunx biome check .  # formatting and lint, the source of truth
```

Cloudflare builds and deploys the Workers straight from this repository — every pull
request gets a preview deployment, and a merge to `master` ships. There are no CI
workflows here and no manual deploy step.

## 🤝 Contributing

Contributions are welcome — open an issue to discuss anything larger before you write it,
and keep a pull request to one subject. The organization-wide guidelines are in
[CONTRIBUTING.md](https://github.com/BX-Team/.github/blob/master/CONTRIBUTING.md).

The documentation for every BX Team project lives here too, under
[`apps/meridian/content/docs`](apps/meridian/content/docs). Read
[`apps/meridian/content/README.md`](apps/meridian/content/README.md) first — it documents
the frontmatter, the MDC components and the icon set the pages are written against, and
review the result on the pull request's preview deployment rather than in the Markdown
source.

## ⚖️ License

This project is licensed under the GNU Affero General Public License v3.0 — see the
[LICENSE](LICENSE) file for details. In short: use it, modify it and self-host it freely,
but a modified version run as a network service has to offer its source to the people
using it.
