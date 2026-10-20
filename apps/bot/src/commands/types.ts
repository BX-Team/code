import type {
  APIApplicationCommandAutocompleteInteraction,
  APIChatInputApplicationCommandInteraction,
  APIInteractionResponse,
  RESTPostAPIChatInputApplicationCommandsJSONBody,
} from 'discord-api-types/v10';
import type { Env } from '../env';

export interface Command {
  data: RESTPostAPIChatInputApplicationCommandsJSONBody;
  execute(interaction: APIChatInputApplicationCommandInteraction, env: Env): Promise<APIInteractionResponse>;
  autocomplete?(interaction: APIApplicationCommandAutocompleteInteraction, env: Env): Promise<APIInteractionResponse>;
}
