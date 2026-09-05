import { SlashCommandBuilder } from '@discordjs/builders';
import { errorEmbed } from '../discord/embeds';
import { autocompleteChoices, focusedOption, reply, stringOption } from '../discord/respond';
import { getLatestBuild, getLatestRelease, getProject, listProjects } from '../downloads/client';
import { latestBuildEmbed, latestReleaseEmbed } from '../downloads/embeds';
import type { Command } from './types';

export const build: Command = {
  data: new SlashCommandBuilder()
    .setName('build')
    .setDescription('Show the latest build of a project')
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

    // A release project has tags rather than versions, so it answers with its newest one.
    if (project.kind === 'release') {
      const release = await getLatestRelease(project.key);
      if (!release) return reply([errorEmbed({ title: `${project.name} has no releases yet` })], { ephemeral: true });

      return reply([latestReleaseEmbed(project, release)]);
    }

    const version = stringOption(interaction.data.options, 'version') ?? project.latest ?? project.versions?.[0];
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
      const keys = project?.versions ?? project?.releases ?? [];

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
