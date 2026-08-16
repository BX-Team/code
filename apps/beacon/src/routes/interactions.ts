import {
  type APIChatInputApplicationCommandInteraction,
  type APIInteraction,
  ApplicationCommandType,
  InteractionResponseType,
  InteractionType,
} from 'discord-api-types/v10';
import { Hono } from 'hono';
import { findCommand } from '../commands';
import type { BeaconEnv } from '../context';
import { errorEmbed } from '../discord/embeds';
import { reply } from '../discord/respond';
import { verifyInteraction } from '../discord/verify';
import { unauthorized } from '../util/error';

export const interactions = new Hono<BeaconEnv>();

interactions.post('/interactions', async c => {
  const body = await c.req.text();
  const valid = await verifyInteraction(
    c.env.DISCORD_PUBLIC_KEY,
    c.req.header('X-Signature-Ed25519') ?? null,
    c.req.header('X-Signature-Timestamp') ?? null,
    body,
  );

  if (!valid) throw unauthorized();

  const interaction = JSON.parse(body) as APIInteraction;

  if (interaction.type === InteractionType.Ping) {
    return c.json({ type: InteractionResponseType.Pong });
  }

  if (interaction.type === InteractionType.ApplicationCommandAutocomplete) {
    const command = findCommand(interaction.data.name);
    if (!command?.autocomplete) {
      return c.json({ type: InteractionResponseType.ApplicationCommandAutocompleteResult, data: { choices: [] } });
    }

    return c.json(await command.autocomplete(interaction, c.env));
  }

  if (interaction.type === InteractionType.ApplicationCommand) {
    if (interaction.data.type !== ApplicationCommandType.ChatInput) {
      return c.json(reply([errorEmbed({ title: 'Unsupported command type' })], { ephemeral: true }));
    }

    const command = findCommand(interaction.data.name);
    if (!command) {
      return c.json(
        reply([errorEmbed({ title: `Unknown command \`${interaction.data.name}\`` })], { ephemeral: true }),
      );
    }

    try {
      return c.json(await command.execute(interaction as APIChatInputApplicationCommandInteraction, c.env));
    } catch (error) {
      console.error(`Command ${interaction.data.name} failed`, error);
      return c.json(
        reply([errorEmbed({ title: 'Command failed', description: 'Please try again in a moment.' })], {
          ephemeral: true,
        }),
      );
    }
  }

  return c.json({ type: InteractionResponseType.Pong });
});
