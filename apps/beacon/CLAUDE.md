# apps/beacon — BX Team Discord bot

Hono Worker serving `beacon.bxteam.org`. It announces repository activity and Atlas
publishes in Discord, and answers the bot's slash commands. Three entry points:

| Path | Source | Purpose |
| --- | --- | --- |
| `POST /github` | BX-Team organisation webhook | pushes, merged PRs, releases |
| `POST /interactions` | Discord Interactions Endpoint URL | slash commands and autocomplete |
| queue `atlas-events` | azimuth | new Atlas versions and builds |

There is no gateway connection and there cannot be one: Workers do not hold a WebSocket
open, so anything that needs `messageCreate`, reactions or bot presence is out of scope.
Everything here is request-driven.

## Bindings

| Binding | Resource | Purpose |
| --- | --- | --- |
| `DISCORD_BOT_TOKEN` | secret | every Discord REST call |
| `DISCORD_PUBLIC_KEY` | secret | verifies the Ed25519 signature on interactions |
| `GITHUB_WEBHOOK_SECRET` | secret | verifies `X-Hub-Signature-256` |
| `DISCORD_APPLICATION_ID` | var | command registration |
| `GUILD_ID` | var | guild commands register instantly, global ones take an hour |

## Layout

- `config/routing.ts` — the entire destination table. Beacon has **no database**: which
  repository announces into which channel is a config change, reviewed in a PR.
- `config/resources.ts` — public BX Team URLs.
- `github/` — signature check and payload → embed rendering.
- `discord/` — signature check, REST wrapper, embed and interaction-response helpers.
- `atlas/` — read client for `api.bxteam.org` plus the release embeds.
- `commands/` — one file per slash command, registered through `commands/index.ts`.
- `queue/consumer.ts` — the `atlas-events` handler.

## Rules

- Every channel id in `config/routing.ts` is just a channel id — **a forum thread is a
  channel**, so a per-repository forum post is addressed the same way as a text channel.
- Signature verification runs before the body is looked at, on the raw bytes. Discord
  probes the endpoint with deliberately bad signatures and expects a 401.
- Interactions must be answered within 3 seconds. Commands respond directly; nothing
  here defers, because a deferred reply needs the Worker to outlive its response.
- The GitHub route answers only after the announcement lands, so a failure shows up as a
  failed delivery in GitHub and can be redelivered from there.
- Queue messages are acked per destination after Discord accepts the post; a failed
  channel retries instead of dropping the event.
- A version is announced on its **first build**, not when its row appears. Version rows are
  inserted by hand, so azimuth emits `version.released` from the upload endpoint instead —
  one upload is always exactly one Discord message.
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
