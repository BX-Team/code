# apps/bot — GitHub App and Discord bot

Hono Worker serving `bot.bxteam.org`, both the BX Team GitHub App and the Discord bot. It keeps release PRs, release commands, the organisation board and pull request titles, announces activity and publishes in Discord and answers slash commands. Three entry points: `/github/webhook`, `/discord/interactions` and `/api/webhook` (from `apps/api` after a publish).

## Layout

- `routes/` — one file per caller.
- `release/` — version and Conventional Commit rules, version file bumps, release notes, the release PR, merge/draft/tag.
- `handlers/` — one file per GitHub behaviour; `commands/` — one file per Discord command.
- `github/`, `discord/`, `downloads/` — the clients and embeds for each side.
- `config/` — the organisation, channels and public URLs. Which repositories release lives in `@bx-team/projects`.

## Rules

- No storage: whatever it remembers lives on GitHub (the release PR body). Everything is request-driven, with no gateway connection.
- Signatures are verified on the raw bytes before the body is parsed; every GitHub payload goes through `@bx-team/types/schema/github`.
- Writes go out as the installation, never as a person, so they trigger workflows.
- Repository work fails the delivery; a failed Discord announcement is only logged. Shipping is idempotent, because a redelivery reruns it.
- The bot tags, the release workflow builds: the draft is created before the `v*` tag, and the workflow never bumps or commits.

## Development

```bash
bun dev                                  # wrangler dev; local secrets in .dev.vars
bun run build                            # wrangler deploy --dry-run
bun --env-file=.dev.vars run register    # publish command definitions to Discord; deploying does not
```
