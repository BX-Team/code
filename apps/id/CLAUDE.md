# apps/id — BX ID

Hono Worker for BX ID on `api.bxteam.org/v1/auth` (Better Auth) and `/v1/play` (friends, presence, lobbies). D1 `id-db` holds accounts and the activity log; Durable Objects hold the live state: `UserHub`, one per BX ID with its launchers' sockets and presence, and `Lobby`, one per hosted world.

## Layout

- `auth.ts` — the Better Auth setup: email codes, Discord and GitHub, usernames, bearer tokens for apps, device sign-in for launchers, and the hooks that log activity.
- `session.ts` — `signedIn`, the middleware every route behind a session uses; `service.ts` — `IdService`, what products may ask over their `ID` binding.
- `activity.ts`, `apps.ts`, `picture.ts`, `notice.ts` — the account pages' routes; `events.ts` writes the activity log.
- `play/` — friends (`friends.ts`), the hub and lobby Durable Objects, TURN credentials (`ice.ts`), and their routes.

## Rules

- BX ID serves several products and knows none of them: product data stays in the product, and deleting a BX ID calls `forget` on every `PRODUCT_*` binding.
- A Discord or GitHub account joins an existing BX ID, or makes a new one, only with an address the provider has verified. No `trustedProviders`.
- Kill switches and limits come from Flagship (`@bx-team/worker/flags`); each has a built-in value that runs while Flagship has no answer.
- Activity is logged for the player's own actions only, never fails what it describes, and keeps the last `activity-kept` entries.
- Mail goes out through stockholm's SMTP; codes are sent after the response, so its timing tells nothing about which addresses exist.

## Development

```bash
bun dev               # scripts/setup.ts (secrets, migrations, dev accounts), then wrangler dev on :8787
CROWD=1 bun dev       # the same with 30 made-up friends for long lists
bun run test
```

Dev accounts are alice, bob and carol `@bxid.test`, with launcher tokens `dev<name>token`; sign-in codes print in this terminal. Skins run next to it in their own terminal (`cd ../skins && bun dev`).
