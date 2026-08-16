import type { BuildPublishedEvent, VersionReleasedEvent } from '@bx-team/types/schema/events';
import type { EmbedBuilder } from '@discordjs/builders';
import { RESOURCES } from '../config/resources';
import { COLORS, createEmbed } from '../discord/embeds';
import type { AtlasBuild, AtlasProject } from './client';

const MAX_COMMITS_SHOWN = 5;

const CHANNEL_COLORS = {
  STABLE: COLORS.success,
  BETA: COLORS.warning,
  ALPHA: COLORS.brand,
} as const;

export function buildPublishedEmbed(event: BuildPublishedEvent): EmbedBuilder {
  return createEmbed({
    color: CHANNEL_COLORS[event.channel],
    title: `${event.project.name} ${event.version} — build #${event.build}`,
    url: `${RESOURCES.downloads}/${event.project.key}`,
    description: commitLines(event.commits),
    fields: [{ name: 'Channel', value: event.channel, inline: true }, ...artifactFields(event.download)],
  });
}

/** The first build of a version */
export function versionReleasedEmbed(event: VersionReleasedEvent): EmbedBuilder {
  return createEmbed({
    color: CHANNEL_COLORS[event.channel],
    title: `${event.project.name} ${event.version} is now available`,
    url: `${RESOURCES.downloads}/${event.project.key}`,
    description: commitLines(event.commits),
    fields: [
      { name: 'Support', value: event.supportStatus, inline: true },
      ...(event.javaMinVersion ? [{ name: 'Minimum Java', value: String(event.javaMinVersion), inline: true }] : []),
      { name: 'Channel', value: event.channel, inline: true },
      ...artifactFields(event.download),
    ],
    footer: `build #${event.build}`,
  });
}

export function latestBuildEmbed(project: AtlasProject, version: string, build: AtlasBuild): EmbedBuilder {
  const download = Object.values(build.downloads)[0];

  return createEmbed({
    color: CHANNEL_COLORS[build.channel],
    title: `${project.name} ${version} — build #${build.id}`,
    url: `${RESOURCES.downloads}/${project.id}`,
    description: commitLines(build.commits),
    fields: [
      { name: 'Channel', value: build.channel, inline: true },
      ...artifactFields(download && { fileName: download.name, size: download.size, url: download.url }),
    ],
    footer: `Published ${new Date(build.time).toUTCString()}`,
    timestamp: false,
  });
}

function artifactFields(download: { fileName: string; size: number; url: string } | undefined) {
  if (!download) return [];

  return [
    { name: 'Size', value: formatSize(download.size), inline: true },
    { name: 'Download', value: `[${download.fileName}](${download.url})` },
  ];
}

function commitLines(commits: { sha: string; message: string }[]): string | undefined {
  if (commits.length === 0) return undefined;

  const lines = commits
    .slice(0, MAX_COMMITS_SHOWN)
    .map(commit => `\`${commit.sha.slice(0, 7)}\` ${commit.message.split('\n')[0]}`);

  if (commits.length > MAX_COMMITS_SHOWN) {
    lines.push(`… and ${commits.length - MAX_COMMITS_SHOWN} more commits`);
  }

  return lines.join('\n');
}

function formatSize(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(2)} MiB`;
}
