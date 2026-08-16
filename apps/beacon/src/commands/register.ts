import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';
import { commands } from './index';

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

const rest = new REST({ version: '10' }).setToken(token);
const body = commands.map(command => command.data);

await rest.put(route, { body });

console.log(`Registered ${body.length} command(s)${guildId ? ` in guild ${guildId}` : ' globally'}.`);
