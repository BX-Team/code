# apps/skins — nicks and skins

Hono Worker on `api.bxteam.org/v1/skins`, a BX ID product: offline nicks held by a BX ID, the skin each nick wears, and the game session endpoints that let Riven's Java agent show those skins in Minecraft. D1 `skins-db` holds nicks and recent joins; R2 `skins` holds the PNGs at `<userId>/<model>/<sha256>.png`.

## Layout

- `app.ts` — the app, CORS and `signedIn`, which asks BX ID over the `ID` binding.
- `profiles.ts` — nicks and skins for the site and the launcher, and public textures.
- `session.ts` — Mojang's session server shapes (`join`, `hasJoined`, `profile`) for the agent, game tokens, and the signing key's public half.
- `service.ts` — `SkinsService`, the `forget` BX ID calls when an account is deleted.

## Rules

- A nick is the vanilla client's name rules, unique without case, at most `nicks-per-account` per BX ID; a released nick stays its owner's for `nick-hold-days`. A name a Microsoft account has cannot be claimed.
- `join` takes only a Riven game token (`rgt1.`), never a Microsoft one; a nick released since the token was made no longer joins.
- `session/minecraft/hasJoined` answers Riven's joins and passes everyone else to Mojang through the stockholm proxy untouched. `sessionserver/session/minecraft/hasJoined` is for servers that asked Mojang first: Riven's joins only, never Mojang again.
- Textures are signed SHA1withRSA over the base64 value, as authlib checks Mojang's; the agent trusts `session/publickey`. Texture URLs are content hashes, cached forever.

## Development

```bash
bun dev        # scripts/setup.ts (signing key, token secret, migrations), then wrangler dev on :8788
bun run test
```

Run BX ID next to it (`cd ../id && bun dev`): the `ID` binding finds it through wrangler's dev registry.
