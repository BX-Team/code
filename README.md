<div align="center">

# BX Team Monorepo

Welcome! If you've stumbled upon this repository, you've found the source behind the **BX Team** ecosystem — the website, the status page, and **Pulsify**, our observability stack for Minecraft servers and plugins.

[![Commit activity](https://img.shields.io/github/commit-activity/m/BX-Team/code?style=for-the-badge&color=06b6d4)](https://github.com/BX-Team/code/pulse)
[![License](https://img.shields.io/badge/license-AGPL--3.0-06b6d4?style=for-the-badge)](LICENSE)
[![Discord](https://img.shields.io/discord/931595732752953375?style=for-the-badge&color=06b6d4&label=discord&logo=discord&logoColor=white)](https://discord.gg/qNyybSSPm5)

</div>

---

BX Team is an open source community building tools and software that empower Minecraft server owners, developers, and players. Our plugins, server software, and libraries live in separate repositories across the [BX-Team organization](https://github.com/BX-Team); this repo holds the web platform that ties them together.

If you're not a developer and just want to use our tools, head to [bxteam.org](https://bxteam.org) or browse the [organization](https://github.com/BX-Team) for individual projects like DivineMC, Quark, and NDailyRewards.

## What's inside

This is a [Bun workspaces](https://bun.sh/docs/pm/workspaces) monorepo. Everything is TypeScript.

### Apps (`apps/`)

| App        | Description                                                        | Stack                          |
| ---------- | ------------------------------------------------------------------ | ------------------------------ |
| `meridian` | Main website, docs, downloads, and the Pulsify dashboard           | Nuxt 4, Vue 3, Tailwind v4     |
| `influx`   | Ingest gateway — validates auth, queues incoming events            | Hono, BullMQ, Redis            |
| `cinder`   | Background worker — consumes the ingest queue, evaluates alerts    | BullMQ, ClickHouse, Postgres   |
| `zenith`   | Status page (uptime monitor), deployed to the edge                | Cloudflare Workers, Vue 3      |

### Packages (`packages/`)

| Package   | Description                                              |
| --------- | -------------------------------------------------------- |
| `stratus` | Database schemas and the Drizzle client (Postgres)       |
| `types`   | Shared Zod schemas, types, and data-scrubbing helpers    |
| `ui`      | Shared Vue 3 component library and design tokens          |

Data lands in Postgres (relational state) and ClickHouse (high-volume time-series events); Redis backs the queue and rate limiting.

## Development

You'll need [Bun](https://bun.sh) (the version is pinned in `package.json`). Install dependencies once from the repo root:

```bash
bun install
```

Then run any app through the workspace scripts:

```bash
bun dev              # everything in parallel
bun dev:meridian     # just the website + dashboard
bun dev:influx       # just the ingest gateway
bun dev:cinder       # just the worker
```

Each app reads its own `.env` — copy the `.env.example` next to it as a starting point. Per-app setup notes live in each project's `CLAUDE.md`.

## Contributing

We welcome contributions! Open an issue to discuss larger changes first and keep pull requests focused.

## Security

Found a vulnerability? Please **do not** open a public issue. Reach out privately through our [Discord](https://discord.gg/qNyybSSPm5) so we can address it before disclosure.

## Support

- **Discord:** [discord.gg/qNyybSSPm5](https://discord.gg/qNyybSSPm5)
- **Website:** [bxteam.org](https://bxteam.org)
- **Organization:** [github.com/BX-Team](https://github.com/BX-Team)

## License

Copyright © 2022-2026 BX Team.

This project is licensed under the **GNU Affero General Public License v3.0** — see [`LICENSE`](LICENSE) for the full text. In short: you're free to use, modify, and self-host it, but if you run a modified version as a network service, you must make your source available to its users under the same terms.
