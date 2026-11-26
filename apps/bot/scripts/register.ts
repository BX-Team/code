import { Routes } from 'discord-api-types/v10';
import { commands, messageCommands } from '../src/commands/index';
import { discordClient } from '../src/discord/rest';

const applicationId = process.env.DISCORD_APPLICATION_ID;
const guildId = process.env.GUILD_ID;
const token = process.env.DISCORD_BOT_TOKEN;

if (!applicationId || !token) {
  console.error('DISCORD_APPLICATION_ID and DISCORD_BOT_TOKEN must be set.');
  process.exit(1);
}

const route = guildId
  ? Routes.applicationGuildCommands(applicationId, guildId)
  : Routes.applicationCommands(applicationId);

const body = [...commands.map(command => command.data), ...messageCommands.map(command => command.data)];

await discordClient(token)('PUT', route, body);

console.log(`Registered ${body.length} command(s)${guildId ? ` in guild ${guildId}` : ' globally'}.`);
