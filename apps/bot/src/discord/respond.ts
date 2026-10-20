import type { EmbedBuilder } from '@discordjs/builders';
import {
  type APIApplicationCommandInteractionDataBasicOption,
  type APIApplicationCommandInteractionDataOption,
  type APIInteractionResponse,
  type APIInteractionResponseCallbackData,
  ApplicationCommandOptionType,
  InteractionResponseType,
  MessageFlags,
} from 'discord-api-types/v10';

export function reply(embeds: EmbedBuilder[], options: { ephemeral?: boolean } = {}): APIInteractionResponse {
  const data: APIInteractionResponseCallbackData = { embeds: embeds.map(embed => embed.toJSON()) };
  if (options.ephemeral) data.flags = MessageFlags.Ephemeral;

  return { type: InteractionResponseType.ChannelMessageWithSource, data };
}

export function autocompleteChoices(choices: { name: string; value: string }[]): APIInteractionResponse {
  return {
    type: InteractionResponseType.ApplicationCommandAutocompleteResult,
    data: { choices: choices.slice(0, 25) },
  };
}

export function stringOption(
  options: APIApplicationCommandInteractionDataOption[] | undefined,
  name: string,
): string | undefined {
  const option = options?.find(candidate => candidate.name === name) as
    | APIApplicationCommandInteractionDataBasicOption
    | undefined;

  if (option?.type !== ApplicationCommandOptionType.String) return undefined;
  return option.value || undefined;
}

/** The option Discord is currently asking for suggestions on. */
export function focusedOption(options: APIApplicationCommandInteractionDataOption[] | undefined) {
  return options?.find(option => 'focused' in option && option.focused) as
    | (APIApplicationCommandInteractionDataBasicOption & { focused: true })
    | undefined;
}
