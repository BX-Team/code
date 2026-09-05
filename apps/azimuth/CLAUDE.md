# apps/azimuth — BX Team downloads API

Hono Worker serving `api.bxteam.org`. It owns everything BX Team publishes: projects,
versions, builds, releases and the artifacts behind them. Reads are public and
credential-less; a publish authenticates with a token that belongs to one project.

**This is the only app in the repository with storage.** meridian's `/downloads` reads
it, beacon reads a publish back from it, and a release workflow in a project's own
repository is what writes to it.

| Path | Who calls it |
| --- | --- |
| `GET /v1/projects`, `/v1/builds/…`, `/v1/releases/…` | meridian, beacon, anyone |
| `GET /v1/publish/next/{project}/{version}` | a release workflow, before it builds |
| `POST /v1/publish/builds\|releases/…` | a release workflow, after it builds |
| `PATCH`/`DELETE /v1/publish/…` | maintenance, by hand |
| `GET /health`, `/location`, `/v1/openapi.json` | service endpoints |

## Bindings

| Binding | Resource | Purpose |
| --- | --- | --- |
| `DB` | D1 `atlas-db` | projects, tokens, versions, builds, releases and their children |
| `BUCKET` | R2 `builds` | the published artifacts |
| `R2_PUBLIC_URL` | var | public origin the bucket is served from (`files.bxteam.org`) |
| `BEACON_PUBLISH_URL` | var | where a publish is announced; empty leaves it silent |
| `BEACON_WEBHOOK_SECRET` | secret | keys the `X-Azimuth-Signature` HMAC beacon verifies |

The database name is historical — `atlas-db` is the D1 instance the old Atlas API used,
reused rather than replaced because it was empty.

## Layout

The layers are not interchangeable:

- `routes/` — HTTP handlers, one file per resource, plus `internal.ts` for the service
  endpoints. `routes/index.ts` is the whole route table.
- `models/downloads.ts` — the API contract: what gets serialised into a response.
- `database/downloads.ts` (reads) and `database/publish.ts` (writes) — rows and the SQL
  against them. No ORM: the schema is fixed and every query here is known.
- `util/` — the shared error type, the edge cache, the token guard, version ordering.
- `openapi.ts` — the hand-authored OpenAPI 3.1 document meridian renders at `/docs/api`.

`models/` and `database/` are separate on purpose. Mixing them is what turns a schema
refactor into a breaking API change.

## Rules

- One error type (`util/error.ts`) and one error shape (`{ ok, error, message }`).
  Handlers `throw badRequest()` / `notFound()` / …; `app.onError` renders it. Never
  hand-roll `try`/`catch` plus `c.json({ ok: false, ... })` in a handler.
- **A project answers under its own tree and 404s under the other.** A versioned project
  has builds, a release project has tags; asking for the wrong one is absent, never
  forbidden.
- **The server is never in the download path.** A `Download` carries a `url` pointing at
  the bucket's public origin. Do not add a redirect endpoint and do not add a download
  counter — that is what would put this Worker back in the path.
- **A publish upserts.** Publishing the same build number again replaces that named
  download and leaves the others alone, so a re-run of a failed upload step is safe and a
  project with several artifacts publishes them one request at a time.
- **The build number comes from `/v1/publish/next`, not from `github.run_number`.** That
  endpoint is behind the token and never cached, so a failed run does not burn a number
  and the sequence stays gapless.
- Requests are parsed through the Zod schemas in `@bx-team/types/schema/downloads`,
  never read off an untyped object.
- **D1 binds at most 100 parameters per statement.** Commit inserts and `in (…)` lookups
  are chunked for that reason; keep it that way when adding a query.
- D1 has no interactive transactions. `db.batch()` is the atomic unit, and a publish
  compensates by hand: the object is deleted from the bucket, and the parent row too when
  that publish is what created it.
- Public GETs go through `edgeCache`. It is a no-op on `*.workers.dev` — real hits need
  the custom domain. A publish purges the exact URLs it invalidated; a deeper page of
  builds can be up to `max-age` stale. `Cache-Control: no-cache` bypasses it, which is
  how beacon reads a publish back the instant it is told about one.

## Publishing

A token belongs to one project and is stored only as a SHA-256 hash. Mint one, then
register it:

```bash
TOKEN=$(python3 -c "import secrets; print(secrets.token_hex(32))")
HASH=$(printf %s "$TOKEN" | sha256sum | cut -d' ' -f1)
echo "$TOKEN"   # goes into the publishing repository's secrets; it is not recoverable
bunx wrangler d1 execute atlas-db --remote \
  --command "insert into tokens (project, token_hash, title) values ('divinemc', '$HASH', 'release workflow')"
```

A new project is a row, and there is no endpoint that creates one — that is deliberate,
projects are rare and adding one is a decision:

```bash
bunx wrangler d1 execute atlas-db --remote \
  --command "insert into projects (key, name, kind, repo) values ('nyx', 'Nyx', 'release', 'Nyx')"
```

Versions are created by publishing into them. `PATCH /v1/publish/versions/{project}/{version}`
sets a support status and a Java floor afterwards, and
`PATCH /v1/publish/projects/{project}` sets which version `/downloads` opens on.

## Development

```bash
bun dev:azimuth      # wrangler dev
bun build:azimuth    # wrangler deploy --dry-run
bunx wrangler d1 migrations apply atlas-db --remote
```

Copy `.dev.vars.example` to `.dev.vars` for local secrets. Cloudflare builds and deploys
this Worker from the repository — there is no deploy workflow here.

**A jar goes through this Worker on its way to the bucket**, so an upload is capped by
Cloudflare's request body limit (100 MB) and by the isolate's memory. DivineMC's
paperclip jars sit around 70 MB. If they outgrow that, the escape hatch is a presigned
PUT straight to R2 with the metadata posted separately — not a bigger buffer.
