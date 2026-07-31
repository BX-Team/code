# BX Team

The BX Team web platform: the public site, the downloads API and Pulsify — observability for Minecraft servers and plugins.

## What's inside

| Path | What it is |
| --- | --- |
| `apps/azimuth` | Application API — `/auth`, `/atlas`, `/pulsify` (Rust, axum) |
| `apps/cinder` | Ingest queue consumer, alerting and scheduled jobs (Rust) |
| `apps/influx` | Ingest gateway for the Pulsify SDK (Rust, axum) |
| `apps/meridian` | bxteam.org — Nuxt 4, statically generated |
| `packages/{types,database,analytics,storage,mail,geoip,util}` | Shared Rust crates |
| `packages/ui` | Shared Vue 3 design system |

## Getting started

Backend. It needs a PostgreSQL, a ClickHouse and an S3-compatible endpoint reachable through
`DATABASE_URL`, `CLICKHOUSE_URL` and `R2_*`; how you run those locally is up to you.

```sh
cargo check --workspace
cargo test --workspace
```

Frontend:

```sh
bun install
bun run dev:meridian
```

## Deployment

The three Rust services are shipped as Docker images to `ghcr.io/bx-team/{azimuth,influx,cinder}` and run under podman on a NixOS host; `meridian` is deployed to Cloudflare Workers Static Assets. One workspace version, one release tag.

## License

AGPL-3.0-only. See [LICENSE](LICENSE).
