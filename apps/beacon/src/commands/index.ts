import { build } from './build';
import { docs } from './docs';
import type { Command } from './types';

export const commands: Command[] = [docs, build];

const byName = new Map(commands.map(command => [command.data.name, command]));

export function findCommand(name: string): Command | undefined {
  return byName.get(name);
}

export type { Command };
