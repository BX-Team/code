import { ApplicationCommandOptionType } from 'discord-api-types/v10';
import { errorEmbed } from '../discord/embeds';
import { autocompleteChoices, focusedOption, reply, stringOption } from '../discord/respond';
import { getLatestBuild, getProject, listProjects } from '../downloads/client';
import { latestBuildEmbed } from '../downloads/embeds';
import type { Command } from './types';

export const build: Command = {
  data: {
    name: 'build',
    description: 'Show the latest build of a project',
    options: [
      {
        type: ApplicationCommandOptionType.String,
        name: 'project',
        description: 'Project key',
        required: true,
        autocomplete: true,
      },
      {
        type: ApplicationCommandOptionType.String,
        name: 'version',
        description: 'Version key; defaults to the newest one',
        autocomplete: true,
      },
    ],
  },

  async execute(interaction) {
    const projectKey = stringOption(interaction.data.options, 'project');
    if (!projectKey) return reply([errorEmbed({ title: 'Missing project' })], { ephemeral: true });

    const project = await getProject(projectKey);
    if (!project) {
      return reply([errorEmbed({ title: `Unknown project \`${projectKey}\`` })], { ephemeral: true });
    }

    const version = stringOption(interaction.data.options, 'version') ?? project.latest ?? project.versions[0];
    if (!version) {
      return reply([errorEmbed({ title: `${project.name} has no versions yet` })], { ephemeral: true });
    }

    const latest = await getLatestBuild(project.key, version);
    if (!latest) {
      return reply([errorEmbed({ title: `No builds for ${project.name} ${version}` })], { ephemeral: true });
    }

    return reply([latestBuildEmbed(project, latest)]);
  },

  async autocomplete(interaction) {
    const focused = focusedOption(interaction.data.options);
    const query = String(focused?.value ?? '').toLowerCase();

    if (focused?.name === 'version') {
      const projectKey = stringOption(interaction.data.options, 'project');
      const project = projectKey ? await getProject(projectKey) : null;
      const keys = project?.versions ?? [];

      return autocompleteChoices(
        keys.filter(key => key.toLowerCase().includes(query)).map(key => ({ name: key, value: key })),
      );
    }

    const projects = (await listProjects()) ?? [];
    return autocompleteChoices(
      projects
        .filter(project => project.key.toLowerCase().includes(query) || project.name.toLowerCase().includes(query))
        .map(project => ({ name: project.name, value: project.key })),
    );
  },
};
