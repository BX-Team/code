# apps/bot — BX Team bot for GitHub and Discord

Hono Worker serving `bot.bxteam.org`. It is both the BX Team GitHub App and the Discord
bot: it runs the repository chores no workflow should have to — release PRs, release
commands, the organisation board, pull request titles — announces repository activity
and published builds in Discord, and answers the bot's slash commands. Three entry points,
each named after who calls it:

| Path | Source | Purpose |
| --- | --- | --- |
| `POST /github/webhook` | the GitHub App webhook, every installed repository | push, pull_request, issues, issue_comment, release |
| `POST /discord/interactions` | Discord Interactions Endpoint URL | slash commands and autocomplete |
| `POST /api/webhook` | `apps/api`, after a publish | new builds and releases |

The bot has **no storage**. Everything it needs to remember lives on GitHub: the pinned
version and the release summary are read back from the release PR body, the installation
token is minted per isolate.

There is no gateway connection and there cannot be one: Workers do not hold a WebSocket
open, so anything that needs `messageCreate`, reactions or bot presence is out of scope.
Everything here is request-driven.

## What it does

- **Release PR.** A push to the default branch of a repository with a `release` entry in
  `@bx-team/projects` recomputes the next version from the Conventional Commit titles since
  the newest stable `v*` tag, rewrites every file listed for it on the `release/next` branch
  and opens or updates the `chore(release): <version>` PR. Nothing releasable — the PR is closed.
- **Shipping.** Merging that PR dispatches the repository's release workflow with
  `version`, `sha` (the merge commit), `description` (the text above the generated marker)
  and `prerelease`. The workflow keeps tagging, building and publishing as before.
- **Commands** on the release PR, from anyone with write access: `/release` merges it, or
  turns on auto-merge while checks run; `/version <x.y.z>` pins a version, pre-releases
  included; `/version auto` drops the pin.
- **Board.** Every issue and pull request opened by a person is added to the organisation
  project (`PROJECT_NUMBER`). Bots — Renovate, this one — are left off.
- **Title check.** A `Conventional title` check run on every pull request, since the title
  becomes the squash commit and so a line of the release notes.
- **Activity.** Pushes, merged pull requests and published releases are posted into the
  repository's thread in the GitHub forum.
- **Publishes.** A new build or release is posted into the releases channel, rendered off
  a read-back from the API.
- **Slash commands.** `/build` shows the newest build or release of a project, `/docs`
  links the documentation.

## Bindings

| Binding | Resource | Purpose |
| --- | --- | --- |
| `GITHUB_APP_ID` | var | the `iss` of the app JWT |
| `DISCORD_APPLICATION_ID` | var | command registration |
| `GUILD_ID` | var | guild commands register instantly, global ones take an hour |
| `GITHUB_APP_PRIVATE_KEY` | secret | signs the app JWT; **PKCS#8**, see below |
| `GITHUB_WEBHOOK_SECRET` | secret | verifies `X-Hub-Signature-256` |
| `DISCORD_BOT_TOKEN` | secret | every Discord REST call |
| `DISCORD_PUBLIC_KEY` | secret | verifies the Ed25519 signature on interactions |
| `API_WEBHOOK_SECRET` | secret | verifies `X-Api-Signature`; the same value the API signs with |

GitHub downloads the key as PKCS#1 (`BEGIN RSA PRIVATE KEY`), which WebCrypto cannot
import. Convert it once:

```bash
openssl pkcs8 -topk8 -nocrypt -in app.private-key.pem | bunx wrangler secret put GITHUB_APP_PRIVATE_KEY
```

## Layout

- `routes/` — one file per caller: `github.ts`, `discord.ts`, `api.ts`.
- `@bx-team/projects` — which repositories get a release PR, their workflow and the files
  carrying the version, and the Discord thread each repository's activity goes to. Adding
  a repository is a change there, reviewed in a PR.
- `config/organisation.ts` — the organisation, the board number, the allowed title types.
- `config/routing.ts` — the releases channel, and the per-repository thread lookup.
- `config/resources.ts` — public BX Team URLs and the API base.
- `release/` — `version.ts` (semver, Conventional Commits, bump rules), `files.ts`
  (`cargoManifest`, `cargoLock`, marker-scoped `replace`), `notes.ts` (the notes preview,
  grouped by the repository's own `changelog_configuration.json`), `pull.ts` (syncing the
  release PR) and `ship.ts` (merge and dispatch).
- `handlers/` — one file per GitHub behaviour.
- `github/` — the app JWT and installation tokens, a small REST/GraphQL client, and the
  activity embeds.
- `downloads/` — the read client for `api.bxteam.org/v1` and the build and release embeds.
- `discord/` — signature check, REST wrapper, embed and interaction-response helpers.
- `commands/` — one file per slash command, registered through `commands/index.ts`.

## Rules

- Signature verification runs before the body is looked at, on the raw bytes. Discord
  probes the endpoint with deliberately bad signatures and expects a 401.
- Every GitHub payload is parsed through `@bx-team/types/schema/github` before a handler
  sees it. The deliveries come from the App, so every one carries an `installation`; the
  organisation webhook is not used.
- Writes go out as the installation, never as a person: the commits and PRs it creates
  trigger workflows, which they would not under a workflow's `GITHUB_TOKEN`.
- **Repository work fails the delivery; a Discord announcement does not.** A redelivery
  reruns everything the delivery triggered, and dispatching a release twice is worse than
  a missing message, so an announcement failure is logged and reported as
  `announced: "failed"` in the response body.
- A file bump throws when its file no longer has the expected shape, and every `replace`
  pattern must match. A broken release PR beats a release with a stale download link.
- The base version is the newest **stable** tag. A merged release commit whose tag is not
  pushed yet counts as released, so the push of that merge does not reopen the PR.
- A failed command is answered on the PR with a 😕 reaction and a reply.
- A repository's release workflow must accept a `sha` input and tag that commit, and skip
  its own version bump when the files already carry the version.
- Every channel id is just a channel id — **a forum thread is a channel**.
- Interactions must be answered within 3 seconds. Commands respond directly; nothing
  here defers, because a deferred reply needs the Worker to outlive its response.
- **A publish notification carries only what was published**, never a copy of it: the
  project key plus the version and build number, or the tag. The embed is rendered off a
  read-back, so a later correction to the row shows up in Discord too. The read-back
  sends `Cache-Control: no-cache`, because the API edge-caches its public GETs and an
  announcement must not describe the build before this one.
- A project's `repo` is its GitHub repository name inside the organisation, which is what
  a commit link in an embed is built from. A project without one is upstream, and its
  commits are shown unlinked.
- Command permissions are configured in Discord (Server Settings → Integrations), not in
  code.

## Development

```bash
bun dev:bot          # wrangler dev
bun build:bot        # wrangler deploy --dry-run
bun --env-file=.dev.vars run register   # publish command definitions to Discord
```

Copy `.dev.vars.example` to `.dev.vars` for local secrets. Command definitions are only
published by `register` — deploying the Worker does not update them, so a project gaining
docs in the registry reaches `/docs` only after `register` runs again. To feed it real
GitHub deliveries, point a throwaway app's webhook at a tunnel
(`cloudflared tunnel --url http://localhost:8787`), or redeliver one from the app's
Advanced settings.

`API_WEBHOOK_SECRET` has to hold the same value as the API's `BOT_WEBHOOK_SECRET`, and
the API's `BOT_WEBHOOK_URL` has to point at `/api/webhook` here. Leaving either side
unset makes a publish silent rather than failing it.

The GitHub App has to be subscribed to **push, pull request, issues, issue comment and
release** events — the last one is what activity announcements of releases come from.
