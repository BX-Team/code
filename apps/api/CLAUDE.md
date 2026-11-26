# apps/api — downloads API

Hono Worker serving `api.bxteam.org`: projects, versions, builds, releases and their artifacts, on D1 (`DB`, database `atlas-db`) and R2 (`BUCKET`). Reads are public; a publish authenticates with a token that belongs to one project and is stored only as a SHA-256 hash.

## Layout

- `@bx-team/types/api` is the contract: every route as a `@hono/zod-openapi` definition. Change an endpoint there first.
- `routes/` holds the handlers, registered with `.openapi(route, handler)`; read requests with `c.req.valid(...)`, never off the raw request.
- `models/` turns rows into response types, `database/` holds the queries (Kysely over `src/tables.ts`). Keep them apart: mixing them turns a schema refactor into an API change.
- `util/` holds the edge cache, the token guard, version ordering and the publish webhook.

## Rules

- A `Download` carries a `url` on the bucket's public origin: no redirect endpoint and no download counter.
- A publish upserts, so a re-run of a failed upload is safe. The build number comes from `/v1/publish/next`, never `github.run_number`.
- D1 has no interactive transactions: `batch()` is the atomic unit, and a failed publish cleans up by hand.
- A new project is a row inserted with `wrangler d1 execute`; there is no endpoint that creates one.

## Development

```bash
bun dev          # wrangler dev; local secrets in .dev.vars (from .dev.vars.example)
bun run test
bun run build    # wrangler deploy --dry-run
```
