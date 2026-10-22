import { findProject, PROJECTS } from '@bx-team/projects';
import {
  type APIModalSubmissionComponent,
  ApplicationCommandType,
  ComponentType,
  InteractionResponseType,
  TextInputStyle,
} from 'discord-api-types/v10';
import { errorEmbed, successEmbed } from '../discord/embeds';
import { reply } from '../discord/respond';
import { repositoryClient } from '../github/app';
import type { MessageCommand } from './types';

const MODAL = 'issue';
const TITLE_MAX = 256;
const BODY_MAX = 4000;

/** Marks an issue opened from Discord, so the board takes it although the app is its author. */
export const DISCORD_REPORT = '<!-- discord:report -->';

export function isDiscordReport(body: string | null | undefined): boolean {
  return body?.includes(DISCORD_REPORT) ?? false;
}

/**
 * "Create GitHub issue" in a message's Apps menu: a modal prefilled from the message, and an
 * issue opened by the app on submit. Who may use it is set in Discord; by default only admins.
 */
export const createIssue: MessageCommand = {
  data: {
    type: ApplicationCommandType.Message,
    name: 'Create GitHub issue',
    default_member_permissions: '0',
  },
  modal: MODAL,

  async execute(interaction) {
    const message = interaction.data.resolved.messages[interaction.data.target_id]!;
    const [firstLine = ''] = message.content.split('\n');
    const project = PROJECTS.find(candidate => candidate.discord === interaction.channel.id);

    return {
      type: InteractionResponseType.Modal,
      data: {
        // Usernames carry no `:`, and the whole id stays well under Discord's 100 characters.
        custom_id: [MODAL, interaction.channel.id, message.id, message.author.username].join(':'),
        title: 'Create GitHub issue',
        components: [
          {
            type: ComponentType.Label,
            label: 'Project',
            component: {
              type: ComponentType.StringSelect,
              custom_id: 'project',
              options: PROJECTS.slice(0, 25).map(candidate => ({
                label: candidate.name,
                value: candidate.key,
                description: candidate.repo,
                default: candidate.key === project?.key,
              })),
            },
          },
          {
            type: ComponentType.Label,
            label: 'Title',
            component: {
              type: ComponentType.TextInput,
              custom_id: 'title',
              style: TextInputStyle.Short,
              max_length: TITLE_MAX,
              value: firstLine.slice(0, TITLE_MAX) || undefined,
            },
          },
          {
            type: ComponentType.Label,
            label: 'Description',
            component: {
              type: ComponentType.TextInput,
              custom_id: 'body',
              style: TextInputStyle.Paragraph,
              max_length: BODY_MAX,
              required: false,
              value: message.content.slice(0, BODY_MAX) || undefined,
            },
          },
        ],
      },
    };
  },

  async submit(interaction, env) {
    const [, channelId, messageId, author] = interaction.data.custom_id.split(':');
    const values = submitted(interaction.data.components);
    const project = findProject(values.get('project')?.[0] ?? '');
    const title = values.get('title')?.[0]?.trim();
    if (!project || !title) {
      return reply([errorEmbed({ title: 'Pick a project and give the issue a title' })], { ephemeral: true });
    }

    const link = `https://discord.com/channels/${interaction.guild_id ?? '@me'}/${channelId}/${messageId}`;
    const submitter = (interaction.member?.user ?? interaction.user)?.username ?? 'someone';
    const body = [
      values.get('body')?.[0]?.trim(),
      '---',
      `Reported on Discord by **${author}** in [this message](${link}), opened by **${submitter}**.`,
      DISCORD_REPORT,
    ]
      .filter(Boolean)
      .join('\n\n');

    const gh = await repositoryClient(env, project.repo);
    const issue = await gh.request<{ number: number; html_url: string }>('POST', `/repos/${project.repo}/issues`, {
      title,
      body,
    });

    return reply([
      successEmbed({
        title: `${project.repo}#${issue.number}`,
        url: issue.html_url,
        description: title,
        footer: `Opened by ${submitter}`,
      }),
    ]);
  },
};

/** Each answered field of a modal by its `custom_id`; a text input as one value, a select as many. */
function submitted(components: APIModalSubmissionComponent[]): Map<string, string[]> {
  const values = new Map<string, string[]>();
  for (const row of components) {
    if (row.type !== ComponentType.Label) continue;
    const field = row.component;
    if (field.type === ComponentType.TextInput) values.set(field.custom_id, [field.value]);
    if (field.type === ComponentType.StringSelect) values.set(field.custom_id, field.values);
  }
  return values;
}
