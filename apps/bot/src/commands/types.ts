import type {
  APIApplicationCommandAutocompleteInteraction,
  APIChatInputApplicationCommandInteraction,
  APIInteractionResponse,
  APIMessageApplicationCommandInteraction,
  APIModalSubmitInteraction,
  RESTPostAPIChatInputApplicationCommandsJSONBody,
  RESTPostAPIContextMenuApplicationCommandsJSONBody,
} from 'discord-api-types/v10';
import type { Env } from '../env';

export interface Command {
  data: RESTPostAPIChatInputApplicationCommandsJSONBody;
  execute(interaction: APIChatInputApplicationCommandInteraction, env: Env): Promise<APIInteractionResponse>;
  autocomplete?(interaction: APIApplicationCommandAutocompleteInteraction, env: Env): Promise<APIInteractionResponse>;
}

/** An entry in a message's Apps menu; it answers with a modal, whose submission comes back to `submit`. */
export interface MessageCommand {
  data: RESTPostAPIContextMenuApplicationCommandsJSONBody;
  /** The prefix of every modal `custom_id` this command opens, `<prefix>:…`. */
  modal: string;
  execute(interaction: APIMessageApplicationCommandInteraction, env: Env): Promise<APIInteractionResponse>;
  submit(interaction: APIModalSubmitInteraction, env: Env): Promise<APIInteractionResponse>;
}
