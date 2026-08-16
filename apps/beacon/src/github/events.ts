import type { EmbedBuilder } from '@discordjs/builders';
import type { GithubEvent } from '../config/routing';
import { COLORS, createEmbed } from '../discord/embeds';

const MAX_COMMITS_SHOWN = 5;
const MAX_RELEASE_BODY = 1500;

interface Actor {
  login?: string;
  avatar_url?: string;
  html_url?: string;
}

interface Repository {
  name: string;
  full_name?: string;
  html_url: string;
  default_branch: string;
  owner?: { login?: string; name?: string };
}

export interface GithubPayload {
  repository?: Repository;
  sender?: Actor;
  action?: string;
  ref?: string;
  compare?: string;
  commits?: { id: string; message: string; url: string }[];
  pull_request?: {
    number: number;
    title?: string;
    html_url: string;
    merged?: boolean;
    merged_by?: Actor;
    head?: { ref?: string };
    base?: { ref?: string };
  };
  release?: {
    name?: string;
    tag_name: string;
    html_url: string;
    body?: string;
    draft?: boolean;
    prerelease?: boolean;
    author?: Actor;
  };
}

export interface RenderedEvent {
  embed: EmbedBuilder;
  /** Branch the event belongs to; release events are not branch-scoped. */
  branch: string;
}

/** Turns a delivery into an embed, or null when it is not worth announcing. */
export function renderEvent(event: GithubEvent, payload: GithubPayload): RenderedEvent | null {
  switch (event) {
    case 'push':
      return renderPush(payload);
    case 'pull_request':
      return renderPullRequest(payload);
    case 'release':
      return renderRelease(payload);
  }
}

function renderPush(payload: GithubPayload): RenderedEvent | null {
  const ref = payload.ref ?? '';
  if (!ref.startsWith('refs/heads/')) return null;

  const branch = ref.slice('refs/heads/'.length);
  const commits = payload.commits ?? [];
  if (!branch || commits.length === 0) return null;

  const repo = payload.repository;
  if (!repo) return null;

  const lines = commits.slice(0, MAX_COMMITS_SHOWN).map(commit => {
    const sha = commit.id.slice(0, 7);
    const summary = commit.message.split('\n')[0];
    return `[\`${sha}\`](${commit.url}) ${summary}`;
  });

  if (commits.length > MAX_COMMITS_SHOWN) {
    lines.push(`… and ${commits.length - MAX_COMMITS_SHOWN} more commits`);
  }

  const embed = createEmbed({
    author: actor(payload.sender),
    title: `[${repoName(repo)}] ${commits.length} new commit${commits.length === 1 ? '' : 's'} on ${branch}`,
    url: payload.compare ?? repo.html_url,
    description: lines.join('\n'),
  });

  return { embed, branch };
}

function renderPullRequest(payload: GithubPayload): RenderedEvent | null {
  const pr = payload.pull_request;
  const repo = payload.repository;
  if (!pr || !repo || payload.action !== 'closed' || !pr.merged) return null;

  const base = pr.base?.ref;
  if (!base) return null;

  const mergedBy = pr.merged_by ?? payload.sender;

  const embed = createEmbed({
    color: COLORS.success,
    author: actor(mergedBy),
    title: `[${repoName(repo)}] Pull request #${pr.number} merged`,
    url: pr.html_url,
    description: pr.title,
    fields: [
      { name: 'Branch', value: `\`${pr.head?.ref ?? '?'}\` → \`${base}\``, inline: true },
      { name: 'Merged by', value: mergedBy?.login ?? 'unknown', inline: true },
    ],
  });

  return { embed, branch: base };
}

function renderRelease(payload: GithubPayload): RenderedEvent | null {
  const release = payload.release;
  const repo = payload.repository;
  if (!release || !repo || payload.action !== 'published' || release.draft) return null;

  const embed = createEmbed({
    color: release.prerelease ? COLORS.warning : COLORS.success,
    author: actor(release.author ?? payload.sender),
    title: `[${repoName(repo)}] ${release.prerelease ? 'Pre-release' : 'Release'} ${release.name || release.tag_name}`,
    url: release.html_url,
    description: truncate(release.body, MAX_RELEASE_BODY),
    footer: release.tag_name,
  });

  return { embed, branch: repo.default_branch };
}

function repoName(repo: Repository): string {
  return repo.full_name ?? `${repo.owner?.login ?? repo.owner?.name ?? '?'}/${repo.name}`;
}

function actor(sender: Actor | undefined) {
  return { name: sender?.login ?? 'unknown', iconURL: sender?.avatar_url, url: sender?.html_url };
}

function truncate(text: string | undefined, limit: number): string | undefined {
  if (!text) return undefined;
  return text.length > limit ? `${text.slice(0, limit)}…` : text;
}
