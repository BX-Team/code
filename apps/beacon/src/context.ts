import type { REST } from '@discordjs/rest';
import { createMiddleware } from 'hono/factory';
import { discordRest } from './discord/rest';
import type { Env } from './env';

export type BeaconEnv = { Bindings: Env; Variables: { rest: REST } };

/** Builds the token-bound Discord client once per request. */
export const withRest = createMiddleware<BeaconEnv>(async (c, next) => {
  c.set('rest', discordRest(c.env.DISCORD_BOT_TOKEN));
  await next();
});
