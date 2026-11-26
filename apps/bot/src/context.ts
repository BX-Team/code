import { createMiddleware } from 'hono/factory';
import { type Discord, discordClient } from './discord/rest';

export type BotEnv = { Bindings: Env; Variables: { discord: Discord } };

export const withDiscord = createMiddleware<BotEnv>(async (c, next) => {
  c.set('discord', discordClient(c.env.DISCORD_BOT_TOKEN));
  await next();
});
