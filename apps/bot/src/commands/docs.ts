import { SlashCommandBuilder } from '@discordjs/builders';
import { DOC_PROJECTS, RESOURCES } from '../config/resources';
import { createEmbed } from '../discord/embeds';
import { reply, stringOption } from '../discord/respond';
import type { Command } from './types';

export const docs: Command = {
  data: new SlashCommandBuilder()
    .setName('docs')
    .setDescription('Link the BX Team documentation')
    .addStringOption(option =>
      option
        .setName('project')
        .setDescription('Project to link the docs for')
        .addChoices(...DOC_PROJECTS.map(project => ({ name: project.name, value: project.value }))),
    )
    .toJSON(),

  async execute(interaction) {
    const project = stringOption(interaction.data.options, 'project');
    const known = DOC_PROJECTS.find(candidate => candidate.value === project);

    if (!known) {
      return reply([
        createEmbed({
          title: 'BX Team documentation',
          url: RESOURCES.docs,
          description: DOC_PROJECTS.map(
            candidate => `• [${candidate.name}](${RESOURCES.docs}/${candidate.value})`,
          ).join('\n'),
        }),
      ]);
    }

    return reply([
      createEmbed({
        title: `${known.name} documentation`,
        url: `${RESOURCES.docs}/${known.value}`,
        description: `Guides, configuration and reference for ${known.name}.`,
        fields: [{ name: 'Downloads', value: `${RESOURCES.downloads}/${known.value}` }],
      }),
    ]);
  },
};
