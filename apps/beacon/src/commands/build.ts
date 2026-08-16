import { SlashCommandBuilder } from '@discordjs/builders';
import { getLatestBuild, getProject, listProjects, newestVersion } from '../atlas/client';
import { latestBuildEmbed } from '../atlas/embeds';
import { errorEmbed } from '../discord/embeds';
import { autocompleteChoices, focusedOption, reply, stringOption } from '../discord/respond';
import type { Command } from './types';

export const build: Command = {
  data: new SlashCommandBuilder()
    .setName('build')
    .setDescription('Show the latest Atlas build of a project')
    .addStringOption(option =>
      option.setName('project').setDescription('Project key').setRequired(true).setAutocomplete(true),
    )
    .addStringOption(option =>
      option.setName('version').setDescription('Version key; defaults to the newest one').setAutocomplete(true),
    )
    .toJSON(),

  async execute(interaction) {
    const projectKey = stringOption(interaction.data.options, 'project');
    if (!projectKey) return reply([errorEmbed({ title: 'Missing project' })], { ephemeral: true });

    const project = await getProject(projectKey);
    if (!project) {
      return reply([errorEmbed({ title: `Unknown project \`${projectKey}\`` })], { ephemeral: true });
    }

    const version = stringOption(interaction.data.options, 'version') ?? newestVersion(project);
    if (!version) {
      return reply([errorEmbed({ title: `${project.project.name} has no versions yet` })], { ephemeral: true });
    }

    const latest = await getLatestBuild(projectKey, version);
    if (!latest) {
      return reply([errorEmbed({ title: `No builds for ${project.project.name} ${version}` })], { ephemeral: true });
    }

    return reply([latestBuildEmbed(project.project, version, latest)]);
  },

  async autocomplete(interaction) {
    const focused = focusedOption(interaction.data.options);
    const query = String(focused?.value ?? '').toLowerCase();

    if (focused?.name === 'version') {
      const projectKey = stringOption(interaction.data.options, 'project');
      const project = projectKey ? await getProject(projectKey) : null;
      const versions = project ? Object.values(project.version_groups).flat() : [];

      return autocompleteChoices(
        versions
          .filter(version => version.toLowerCase().includes(query))
          .map(version => ({
            name: version,
            value: version,
          })),
      );
    }

    const projects = await listProjects();
    return autocompleteChoices(
      projects
        .filter(
          entry => entry.project.id.toLowerCase().includes(query) || entry.project.name.toLowerCase().includes(query),
        )
        .map(entry => ({ name: entry.project.name, value: entry.project.id })),
    );
  },
};
