import type { PullRequestEvent, PushEvent, ReleaseEvent, User } from '@bx-team/types/schema/github';
import type { EmbedBuilder } from '@discordjs/builders';
import { COLORS, createEmbed } from '../discord/embeds';
import { RELEASE_BRANCH } from '../release/pull';

const MAX_COMMITS_SHOWN = 5;
const MAX_RELEASE_BODY = 1500;

/** A push to a branch, or null when it is not worth announcing. */
export function pushEmbed(event: PushEvent): EmbedBuilder | null {
  if (!event.ref.startsWith('refs/heads/') || event.deleted) return null;

  const branch = event.ref.slice('refs/heads/'.length);
  const { commits, repository } = event;
  if (!branch || branch === RELEASE_BRANCH || commits.length === 0) return null;

  const lines = commits.slice(0, MAX_COMMITS_SHOWN).map(commit => {
    const sha = commit.id.slice(0, 7);
    const summary = commit.message.split('\n')[0];
    return `[\`${sha}\`](${commit.url}) ${summary}`;
  });

  if (commits.length > MAX_COMMITS_SHOWN) {
    lines.push(`… and ${commits.length - MAX_COMMITS_SHOWN} more commits`);
  }

  return createEmbed({
    author: actor(event.sender),
    title: `[${repository.full_name}] ${commits.length} new commit${commits.length === 1 ? '' : 's'} on ${branch}`,
    url: event.compare ?? repository.html_url,
    description: lines.join('\n'),
  });
}

export function mergedEmbed(event: PullRequestEvent): EmbedBuilder | null {
  const pr = event.pull_request;
  if (event.action !== 'closed' || !pr.merged) return null;

  const mergedBy = pr.merged_by ?? event.sender;

  return createEmbed({
    color: COLORS.success,
    author: actor(mergedBy),
    title: `[${event.repository.full_name}] Pull request #${pr.number} merged`,
    url: pr.html_url,
    description: pr.title,
    fields: [
      { name: 'Branch', value: `\`${pr.head.ref}\` → \`${pr.base.ref}\``, inline: true },
      { name: 'Merged by', value: mergedBy.login, inline: true },
    ],
  });
}

export function releaseEmbed(event: ReleaseEvent): EmbedBuilder | null {
  const { release } = event;
  if (event.action !== 'published' || release.draft) return null;

  return createEmbed({
    color: release.prerelease ? COLORS.warning : COLORS.success,
    author: actor(release.author ?? event.sender),
    title: `[${event.repository.full_name}] ${release.prerelease ? 'Pre-release' : 'Release'} ${release.name || release.tag_name}`,
    url: release.html_url,
    description: truncate(release.body, MAX_RELEASE_BODY),
    footer: release.tag_name,
  });
}

function actor(user: User) {
  return { name: user.login, iconURL: user.avatar_url, url: user.html_url };
}

function truncate(text: string | null | undefined, limit: number): string | undefined {
  if (!text) return undefined;
  return text.length > limit ? `${text.slice(0, limit)}…` : text;
}
