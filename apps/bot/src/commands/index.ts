import { build } from './build';
import { docs } from './docs';
import { createIssue } from './issue';
import type { Command, MessageCommand } from './types';

export const commands: Command[] = [docs, build];
export const messageCommands: MessageCommand[] = [createIssue];

const byName = new Map(commands.map(command => [command.data.name, command]));
const messageByName = new Map(messageCommands.map(command => [command.data.name, command]));

export function findCommand(name: string): Command | undefined {
  return byName.get(name);
}

export function findMessageCommand(name: string): MessageCommand | undefined {
  return messageByName.get(name);
}

/** The message command that opened a modal, by the prefix of its `custom_id`. */
export function findModalOwner(customId: string): MessageCommand | undefined {
  const prefix = customId.split(':')[0];
  return messageCommands.find(command => command.modal === prefix);
}

export type { Command, MessageCommand };
