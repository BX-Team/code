<div align="center">

# BX Team Monorepo

Welcome! If you've stumbled upon this repository, you've found the source behind the **BX Team** web platform — our website, documentation, and the downloads API behind every build we publish.

[![Commit activity](https://img.shields.io/github/commit-activity/m/BX-Team/code?style=for-the-badge&color=06b6d4)](https://github.com/BX-Team/code/pulse)
[![License](https://img.shields.io/badge/license-AGPL--3.0-06b6d4?style=for-the-badge)](LICENSE)
[![Discord](https://img.shields.io/discord/931595732752953375?style=for-the-badge&color=06b6d4&label=discord&logo=discord&logoColor=white)](https://discord.gg/qNyybSSPm5)

</div>

---

BX Team is an open source community building tools and software that empower Minecraft server owners, developers, and players. Our plugins, server software, and libraries live in separate repositories across the [BX-Team organization](https://github.com/BX-Team); this repo holds the web platform that ties them together.

If you're not a developer and just want to use our tools, head to [bxteam.org](https://bxteam.org) or browse the [organization](https://github.com/BX-Team) for individual projects like DivineMC, Quark, and NDailyRewards.

## What's inside

This is a [Bun workspaces](https://bun.sh/docs/pm/workspaces) monorepo. Everything is TypeScript, and the entire backend runs on [Cloudflare Workers](https://developers.cloudflare.com/workers).

### Apps (`apps/`)

| App        | Description                                                                 | Stack                              |
| ---------- | -------------------------------------------------------------------------- | ---------------------------------- |
| `meridian` | Main website, docs and downloads — fully static                             | Nuxt 4, Vue 3, Tailwind v4         |
| `azimuth`  | Public API — the `/atlas` downloads route group                             | Hono, Cloudflare Workers, D1, R2   |

### Packages (`packages/`)

| Package   | Description                                              |
| --------- | -------------------------------------------------------- |
| `stratus` | D1 (SQLite) schemas and migrations via Drizzle ORM       |
| `types`   | Shared Zod schemas for the Atlas wire format             |
| `ui`      | Shared Vue 3 component library and design tokens          |

Backend state lives entirely on Cloudflare: the `atlas-db` [D1](https://developers.cloudflare.com/d1/) database for project, version and build metadata, and the `builds` [R2](https://developers.cloudflare.com/r2/) bucket for the artifacts themselves. `meridian` is generated with `nuxt generate` and served as Workers Static Assets — there is no runtime Nitro server.

## Development

You'll need [Bun](https://bun.sh) (the version is pinned in `package.json`). Install dependencies once from the repo root:

```bash
bun install
```

Then run any app through the workspace scripts:

```bash
bun dev              # everything in parallel
bun dev:meridian     # just the static frontend
bun dev:azimuth      # just the API
```

`azimuth` runs on `wrangler dev` and reads secrets from a local `.dev.vars` — copy `.dev.vars.example` as a starting point. D1 schemas and migrations live in `packages/stratus`; `apps/azimuth/wrangler.jsonc` points its `ATLAS_DB` binding at `packages/stratus/drizzle/d1/atlas`. Both apps are built and deployed by Cloudflare directly from this repository. Per-app setup notes live in each project's `CLAUDE.md`.

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
