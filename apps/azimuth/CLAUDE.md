# apps/azimuth — BX Team API

Hono Worker serving `api.bxteam.org`. It exposes one route group, **Atlas** (project, version and build metadata for downloads), plus the service endpoints `/health`, `/location`, `/openapi.json` and `/reference`.

There is no authentication and no user accounts. Reads are public and credential-less; the two publish endpoints (`versions/create`, `builds/upload`) authenticate with the `API_SECRET_KEY` bearer secret used by CI.

## Bindings

| Binding | Resource | Purpose |
| --- | --- | --- |
| `ATLAS_DB` | D1 `atlas-db` | projects, versions, builds, commits, downloads |
| `ATLAS_BUCKET` | R2 `builds` | published artifacts |
| `API_SECRET_KEY` | secret | bearer token for the publish endpoints |
| `R2_PUBLIC_URL` | var | public origin the bucket is served from |

Schemas and migrations live in `packages/stratus`; `wrangler.jsonc` points `ATLAS_DB` at `packages/stratus/drizzle/d1/atlas`.

## Layout

The layers are not interchangeable:

- `routes/` — HTTP handlers, one directory per route group, plus `internal.ts` for the service endpoints.
- `models/` — the API contract: what gets serialised into a response.
- `database/models/` — table rows and the queries against them.
- `util/` — the shared error type, guards, edge caching, version helpers.
- `openapi.ts` — the hand-authored OpenAPI 3.1 document rendered at `/reference`.

`models/` and `database/models/` are separate on purpose. Mixing them is what turns a schema refactor into a breaking API change.

## Rules

- One error type (`util/error.ts`) and one error shape (`{ ok, error, message }`) for the whole API. Handlers `throw badRequest()` / `notFound()` / …; `app.onError` renders it. Never hand-roll `try`/`catch` + `c.json({ ok: false, ... })` in a handler.
- Guards are middleware (`requireApiSecret`), never a check copied into a handler body.
- Request bodies and query strings are parsed through the Zod schemas in `@bx-team/types/schema/atlas`.
- Public GETs go through `edgeCache`. The Cache API is a no-op on `*.workers.dev` — real hits need the custom domain.
- D1 has no interactive transactions. `db.batch()` is the atomic unit; anything wider needs an explicit compensating delete, as in `routes/atlas/upload.ts`.

## Development

```bash
bun dev:azimuth      # wrangler dev
bun build:azimuth    # wrangler deploy --dry-run
```

Copy `.dev.vars.example` to `.dev.vars` for local secrets. Cloudflare builds and deploys this Worker from the repository — there is no deploy workflow here.
