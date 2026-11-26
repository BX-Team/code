import type { APIEmbed } from 'discord-api-types/v10';
import { RESOURCES } from '../config/resources';
import { COLORS, createEmbed } from '../discord/embeds';
import { type Build, type Channel, type Commit, type Download, type ProjectSummary, primaryDownload } from './client';

const MAX_COMMITS_SHOWN = 5;

const CHANNEL_COLORS: Record<Channel, number> = {
  stable: COLORS.success,
  beta: COLORS.warning,
  alpha: COLORS.brand,
};

/** `repo` is the repository's name in the org. */
export const repoUrl = (repo: string) => `${RESOURCES.github}/${repo}`;
export const commitUrl = (repo: string, sha: string) => `${repoUrl(repo)}/commit/${sha}`;

export function buildPublishedEmbed(project: ProjectSummary, build: Build): APIEmbed {
  return createEmbed({
    color: CHANNEL_COLORS[build.channel],
    title: `${project.name} ${build.version} — build #${build.build}`,
    url: `${RESOURCES.downloads}/${project.key}`,
    description: commitLines(project, build.commits),
    fields: [{ name: 'Channel', value: build.channel, inline: true }, ...downloadFields(build.downloads)],
  });
}

export function latestBuildEmbed(project: ProjectSummary, build: Build): APIEmbed {
  return createEmbed({
    color: CHANNEL_COLORS[build.channel],
    title: `${project.name} ${build.version} — build #${build.build}`,
    url: `${RESOURCES.downloads}/${project.key}`,
    description: commitLines(project, build.commits),
    fields: [{ name: 'Channel', value: build.channel, inline: true }, ...downloadFields(build.downloads)],
    footer: `Published ${new Date(build.created_at).toUTCString()}`,
    timestamp: false,
  });
}

function downloadFields(downloads: Record<string, Download>) {
  const download = primaryDownload(downloads);
  if (!download) return [];

  return [
    { name: 'Size', value: formatSize(download.size), inline: true },
    { name: 'Download', value: `[${download.name}](${download.url})` },
  ];
}

/** A project without a repository of its own is upstream, so its commits get no link. */
function commitLines(project: ProjectSummary, commits: Commit[]): string | undefined {
  if (commits.length === 0) return undefined;

  const lines = commits.slice(0, MAX_COMMITS_SHOWN).map(commit => {
    const sha = `\`${commit.sha.slice(0, 7)}\``;
    const label = project.repo ? `[${sha}](${commitUrl(project.repo, commit.sha)})` : sha;
    return `${label} ${commit.summary}`;
  });

  if (commits.length > MAX_COMMITS_SHOWN) {
    lines.push(`… and ${commits.length - MAX_COMMITS_SHOWN} more commits`);
  }

  return lines.join('\n');
}

function formatSize(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(2)} MiB`;
}
