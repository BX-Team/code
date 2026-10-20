import type { EmbedBuilder } from '@discordjs/builders';
import { DiscordAPIError, REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';

const MAX_EMBEDS_PER_MESSAGE = 10;
const THREAD_ARCHIVED = 50083;

export function discordRest(token: string): REST {
  return new REST({ version: '10' }).setToken(token);
}

export async function postEmbeds(rest: REST, channelId: string, embeds: EmbedBuilder[]): Promise<void> {
  for (let i = 0; i < embeds.length; i += MAX_EMBEDS_PER_MESSAGE) {
    const body = { embeds: embeds.slice(i, i + MAX_EMBEDS_PER_MESSAGE).map(embed => embed.toJSON()) };

    try {
      await rest.post(Routes.channelMessages(channelId), { body });
    } catch (error) {
      if (!(error instanceof DiscordAPIError) || error.code !== THREAD_ARCHIVED) throw error;

      await rest.patch(Routes.channel(channelId), { body: { archived: false } });
      await rest.post(Routes.channelMessages(channelId), { body });
    }
  }
}
