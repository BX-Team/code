# apps/beacon — BX Team Discord bot

Hono Worker serving `beacon.bxteam.org`. It announces repository activity and published
builds in Discord, and answers the bot's slash commands. Three entry points:

| Path | Source | Purpose |
| --- | --- | --- |
| `POST /github` | BX-Team organisation webhook | pushes, merged PRs, releases |
| `POST /hooks/publish` | azimuth, after a publish | new builds and releases |
| `POST /interactions` | Discord Interactions Endpoint URL | slash commands and autocomplete |

There is no gateway connection and there cannot be one: Workers do not hold a WebSocket
open, so anything that needs `messageCreate`, reactions or bot presence is out of scope.
Everything here is request-driven.

## Bindings

| Binding | Resource | Purpose |
| --- | --- | --- |
| `DISCORD_BOT_TOKEN` | secret | every Discord REST call |
| `DISCORD_PUBLIC_KEY` | secret | verifies the Ed25519 signature on interactions |
| `GITHUB_WEBHOOK_SECRET` | secret | verifies `X-Hub-Signature-256` |
| `AZIMUTH_WEBHOOK_SECRET` | secret | verifies `X-Azimuth-Signature`; the same value azimuth signs with |
| `DISCORD_APPLICATION_ID` | var | command registration |
| `GUILD_ID` | var | guild commands register instantly, global ones take an hour |

## Layout

- `config/routing.ts` — the entire destination table. Beacon has **no database**: which
  repository announces into which channel is a config change, reviewed in a PR.
- `config/resources.ts` — public BX Team URLs and the azimuth API base.
- `github/` — payload → embed rendering for the organisation webhook.
- `downloads/` — the read client for `api.bxteam.org/v1` and the build and release embeds.
- `discord/` — signature check, REST wrapper, embed and interaction-response helpers.
- `commands/` — one file per slash command, registered through `commands/index.ts`.
- `util/signature.ts` — the `sha256=<hex>` HMAC both webhook receivers verify.

## Rules

- Every channel id in `config/routing.ts` is just a channel id — **a forum thread is a
  channel**, so a per-repository forum post is addressed the same way as a text channel.
- Signature verification runs before the body is looked at, on the raw bytes. Discord
  probes the endpoint with deliberately bad signatures and expects a 401.
- Interactions must be answered within 3 seconds. Commands respond directly; nothing
  here defers, because a deferred reply needs the Worker to outlive its response.
- Both webhook routes answer only after the announcement lands, so a failure shows up as
  a failed delivery — redeliverable from GitHub's UI, and logged by azimuth.
- **A publish notification carries only what was published**, never a copy of it: the
  project key plus the version and build number, or the tag. The embed is rendered off a
  read-back, so a later correction to the row shows up in Discord too. The read-back
  sends `Cache-Control: no-cache`, because azimuth edge-caches its public GETs and an
  announcement must not describe the build before this one.
- A project's `repo` is its GitHub repository name inside the organisation, which is what
  a commit link in an embed is built from. A project without one is upstream, and its
  commits are shown unlinked.
- Command permissions are configured in Discord (Server Settings → Integrations), not in
  code.

## Development

```bash
bun dev:beacon       # wrangler dev
bun build:beacon     # wrangler deploy --dry-run
bun --env-file=.dev.vars run register   # publish command definitions to Discord
```

Copy `.dev.vars.example` to `.dev.vars` for local secrets. Command definitions are only
published by `register` — deploying the Worker does not update them.

`AZIMUTH_WEBHOOK_SECRET` has to hold the same value as azimuth's `BEACON_WEBHOOK_SECRET`,
and azimuth's `BEACON_PUBLISH_URL` has to point at `/hooks/publish` here. Leaving either
side unset makes a publish silent rather than failing it.
