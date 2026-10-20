# apps/helm — BX Team GitHub App

Hono Worker serving `helm.bxteam.org`, the webhook of the BX Team GitHub App. It runs the
repository chores no workflow should have to: release PRs, release commands, the
organisation board and pull request titles. One entry point:

| Path | Source | Purpose |
| --- | --- | --- |
| `POST /github` | the GitHub App webhook, every installed repository | push, pull_request, issues, issue_comment |

Like beacon, helm has **no storage**. Everything it needs to remember lives on GitHub: the
pinned version and the release summary are read back from the release PR body, the
installation token is minted per isolate.

## What it does

- **Release PR.** A push to the default branch of a repository in `config/repositories.ts`
  recomputes the next version from the Conventional Commit titles since the newest stable
  `v*` tag, rewrites every file listed for it on the `release/next` branch and opens or
  updates the `chore(release): <version>` PR. Nothing releasable — the PR is closed.
- **Shipping.** Merging that PR dispatches the repository's release workflow with
  `version`, `sha` (the merge commit), `description` (the text above the generated marker)
  and `prerelease`. The workflow keeps tagging, building and publishing as before.
- **Commands** on the release PR, from anyone with write access: `/release` merges it, or
  turns on auto-merge while checks run; `/version <x.y.z>` pins a version, pre-releases
  included; `/version auto` drops the pin.
- **Board.** Every issue and pull request opened by a person is added to the organisation
  project (`PROJECT_NUMBER`). Bots — Renovate, helm itself — are left off.
- **Title check.** A `Conventional title` check run on every pull request, since the title
  becomes the squash commit and so a line of the release notes.

## Bindings

| Binding | Resource | Purpose |
| --- | --- | --- |
| `GITHUB_APP_ID` | var | the `iss` of the app JWT |
| `GITHUB_APP_PRIVATE_KEY` | secret | signs the app JWT; **PKCS#8**, see below |
| `GITHUB_WEBHOOK_SECRET` | secret | verifies `X-Hub-Signature-256` |

GitHub downloads the key as PKCS#1 (`BEGIN RSA PRIVATE KEY`), which WebCrypto cannot
import. Convert it once:

```bash
openssl pkcs8 -topk8 -nocrypt -in helm.private-key.pem | bunx wrangler secret put GITHUB_APP_PRIVATE_KEY
```

## Layout

- `config/repositories.ts` — the organisation, the board number, the allowed title types
  and the release table: which repositories get a release PR, their workflow, and the
  files carrying the version. Adding a repository is a config change reviewed in a PR.
- `release/version.ts` — semver, Conventional Commit parsing, the bump rules.
- `release/files.ts` — `cargoManifest`, `cargoLock` and marker-scoped `replace` bumps.
- `release/notes.ts` — the notes preview, grouped by the repository's own
  `changelog_configuration.json` so it matches what the release workflow generates.
- `release/pull.ts` — syncing the release PR; `release/ship.ts` — merge and dispatch.
- `handlers/` — one file per behaviour; `routes/github.ts` parses and routes deliveries.
- `github/` — the app JWT and installation tokens, and a small REST/GraphQL client.

## Rules

- Signature verification runs before the body is looked at, on the raw bytes.
- Every payload is parsed through `@bx-team/types/schema/github` before a handler sees it.
- Writes go out as the installation, never as a person: the commits and PRs it creates
  trigger workflows, which they would not under a workflow's `GITHUB_TOKEN`.
- A file bump throws when its file no longer has the expected shape, and every `replace`
  pattern must match. A broken release PR beats a release with a stale download link.
- The base version is the newest **stable** tag. A merged release commit whose tag is not
  pushed yet counts as released, so the push of that merge does not reopen the PR.
- A failed command is answered on the PR with a 😕 reaction and a reply. Any other failure
  fails the delivery, which can be redelivered from the app's Advanced settings.
- A repository's release workflow must accept a `sha` input and tag that commit, and skip
  its own version bump when the files already carry the version.

## Development

```bash
bun dev:helm       # wrangler dev
bun build:helm     # wrangler deploy --dry-run
```

Copy `.dev.vars.example` to `.dev.vars` for local secrets. To feed it real deliveries, point
a throwaway app's webhook at a tunnel (`cloudflared tunnel --url http://localhost:8787`),
or redeliver one from the app's Advanced settings.
