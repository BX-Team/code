import type { APIEmbed } from 'discord-api-types/v10';
import { Routes } from 'discord-api-types/v10';

const API = 'https://discord.com/api/v10';
const MAX_EMBEDS_PER_MESSAGE = 10;
const THREAD_ARCHIVED = 50083;

export class DiscordError extends Error {
  constructor(
    readonly status: number,
    readonly code: number | undefined,
    message: string,
  ) {
    super(message);
  }
}

export type Discord = (method: string, route: string, body?: unknown) => Promise<unknown>;

export function discordClient(token: string): Discord {
  return async (method, route, body) => {
    const response = await fetch(`${API}${route}`, {
      method,
      headers: { Authorization: `Bot ${token}`, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = response.status === 204 ? null : await response.json().catch(() => null);
    if (!response.ok) {
      const error = data as { code?: number; message?: string } | null;
      throw new DiscordError(
        response.status,
        error?.code,
        `${method} ${route}: ${response.status} ${error?.message ?? response.statusText}`,
      );
    }
    return data;
  };
}

export async function postEmbeds(discord: Discord, channelId: string, embeds: APIEmbed[]): Promise<void> {
  for (let i = 0; i < embeds.length; i += MAX_EMBEDS_PER_MESSAGE) {
    const body = { embeds: embeds.slice(i, i + MAX_EMBEDS_PER_MESSAGE) };

    try {
      await discord('POST', Routes.channelMessages(channelId), body);
    } catch (error) {
      if (!(error instanceof DiscordError) || error.code !== THREAD_ARCHIVED) throw error;

      await discord('PATCH', Routes.channel(channelId), { archived: false });
      await discord('POST', Routes.channelMessages(channelId), body);
    }
  }
}
