import { type AtlasEvent, AtlasEventSchema } from '@bx-team/types/schema/events';
import type { Message, MessageBatch } from '@cloudflare/workers-types';
import type { EmbedBuilder } from '@discordjs/builders';
import { buildPublishedEmbed, versionReleasedEmbed } from '../atlas/embeds';
import { atlasRoutesFor } from '../config/routing';
import { discordRest, postEmbeds } from '../discord/rest';
import type { Env } from '../env';

interface Delivery {
  embeds: EmbedBuilder[];
  messages: Message<unknown>[];
}

/**
 * Announces Atlas publishes. Events bound for the same channel are collapsed into one
 * Discord message, and only the messages whose channel actually accepted the post are
 * acknowledged — the rest go back on the queue for another attempt.
 */
export async function consume(batch: MessageBatch<unknown>, env: Env): Promise<void> {
  const rest = discordRest(env.DISCORD_BOT_TOKEN);
  const deliveries = new Map<string, Delivery>();

  for (const message of batch.messages) {
    const parsed = AtlasEventSchema.safeParse(message.body);
    if (!parsed.success) {
      console.error('Dropping malformed atlas event', parsed.error.message);
      message.ack();
      continue;
    }

    const event = parsed.data;
    const routes = atlasRoutesFor(event.project.key, event.channel);
    if (routes.length === 0) {
      message.ack();
      continue;
    }

    for (const route of routes) {
      const delivery = deliveries.get(route.channelId) ?? { embeds: [], messages: [] };
      delivery.embeds.push(render(event));
      delivery.messages.push(message);
      deliveries.set(route.channelId, delivery);
    }
  }

  for (const [channelId, delivery] of deliveries) {
    try {
      await postEmbeds(rest, channelId, delivery.embeds);
      for (const message of delivery.messages) message.ack();
    } catch (error) {
      console.error(`Failed to announce in channel ${channelId}`, error);
      for (const message of delivery.messages) message.retry();
    }
  }
}

function render(event: AtlasEvent): EmbedBuilder {
  return event.type === 'build.published' ? buildPublishedEmbed(event) : versionReleasedEmbed(event);
}
