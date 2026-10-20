import type { ReleaseConfig } from '../config/repositories';
import { type Github, GithubApiError } from '../github/client';
import { CommandError } from '../util/error';
import type { FileBump } from './files';
import { type Commit, previewNotes } from './notes';
import {
  type Bump,
  bumpFor,
  compareSemver,
  formatSemver,
  nextVersion,
  parseSemver,
  releaseTitle,
  releaseTitleVersion,
  type Semver,
} from './version';

export const RELEASE_BRANCH = 'release/next';
const GENERATED = '<!-- helm:generated -->';
const PIN = /<!-- helm:pin (\S+) -->/;
const INTRO_HINT =
  '<!-- Write here, above the helm:generated marker, to open the release notes with a summary. Everything below the marker is rewritten on every push. -->';
const COMPARE_LIMIT = 250;

export interface RepoRef {
  /** `owner/name` */
  full: string;
  owner: string;
  defaultBranch: string;
}

export interface PullRequest {
  number: number;
  node_id: string;
  title: string;
  body: string | null;
  html_url: string;
  head: { ref: string; sha: string };
}

/** `undefined` keeps the pin already in the PR body; `null` drops it. */
export type PinChange = Semver | null | undefined;

export type SyncResult = { state: 'none' } | { state: 'open'; number: number; version: string };

/**
 * Brings the release PR in line with the default branch: opens it when there is something to
 * release, rewrites its commit and body when there is more, and closes it when there is nothing.
 * Stateless — the pin and the intro are read back from the PR body every time.
 */
export async function syncReleasePull(
  gh: Github,
  repo: RepoRef,
  config: ReleaseConfig,
  pinChange: PinChange,
  fromCommand = false,
): Promise<SyncResult> {
  const head = (
    await gh.request<{ object: { sha: string } }>('GET', `/repos/${repo.full}/git/ref/heads/${repo.defaultBranch}`)
  ).object.sha;
  const existing = await findReleasePull(gh, repo);

  const { base, baseTag, commits } = await unreleasedCommits(gh, repo, head);

  let pin = pinChange === undefined ? pinFrom(existing?.body) : pinChange;
  if (pin && compareSemver(pin, base) <= 0) {
    if (fromCommand) throw new CommandError(`\`${formatSemver(pin)}\` is not newer than \`${formatSemver(base)}\`.`);
    pin = null;
  }

  const bump = bumpFor(commits.map(commit => commit.message));
  if (commits.length === 0 || (!pin && !bump)) {
    if (fromCommand) throw new CommandError(`There is nothing to release since \`${baseTag ?? 'the first commit'}\`.`);
    if (existing) await closeReleasePull(gh, repo, existing);
    return { state: 'none' };
  }

  const version = pin ?? nextVersion(base, bump!);
  const title = releaseTitle(version);
  await writeReleaseBranch(gh, repo, config.files, head, version, title);

  const preview = previewNotes(commits, await gh.file(repo.full, '.github/changelog_configuration.json', head));
  const body = [
    introFrom(existing?.body) || INTRO_HINT,
    GENERATED,
    summaryLine(version, pin ? null : bump, commits.length, baseTag),
    'Comment `/release` to merge this once CI is green and ship it, `/version <x.y.z>` to release another version, or `/version auto` to go back to the computed one.',
    `### Release notes preview\n\n${preview}`,
    ...(pin ? [`<!-- helm:pin ${formatSemver(pin)} -->`] : []),
  ].join('\n\n');

  if (existing) {
    await gh.request('PATCH', `/repos/${repo.full}/pulls/${existing.number}`, { title, body });
    return { state: 'open', number: existing.number, version: formatSemver(version) };
  }

  const created = await gh.request<PullRequest>('POST', `/repos/${repo.full}/pulls`, {
    title,
    body,
    head: RELEASE_BRANCH,
    base: repo.defaultBranch,
  });
  return { state: 'open', number: created.number, version: formatSemver(version) };
}

export async function findReleasePull(gh: Github, repo: RepoRef): Promise<PullRequest | null> {
  const open = await gh.request<PullRequest[]>(
    'GET',
    `/repos/${repo.full}/pulls?state=open&head=${encodeURIComponent(`${repo.owner}:${RELEASE_BRANCH}`)}`,
  );
  return open[0] ?? null;
}

/** The summary written above the generated marker, without the hint comment; empty when unset. */
export function releaseIntro(body: string | null | undefined): string {
  return (introFrom(body) ?? '').replace(/<!--[\s\S]*?-->/g, '').trim();
}

/** Commits on the default branch after the last stable release, oldest first. */
async function unreleasedCommits(
  gh: Github,
  repo: RepoRef,
  head: string,
): Promise<{ base: Semver; baseTag: string | null; commits: Commit[] }> {
  const tags = await gh.request<{ ref: string }[]>('GET', `/repos/${repo.full}/git/matching-refs/tags/v`);
  const stable = tags
    .map(tag => tag.ref.slice('refs/tags/'.length))
    .map(name => ({ name, version: parseSemver(name) }))
    .filter((tag): tag is { name: string; version: Semver } => tag.version !== null && tag.version.pre === null)
    .sort((a, b) => compareSemver(b.version, a.version))[0];

  let base: Semver = stable?.version ?? { major: 0, minor: 0, patch: 0, pre: null };
  let commits: Commit[];

  type ApiCommit = { sha: string; html_url: string; commit: { message: string } };
  const toCommit = (c: ApiCommit): Commit => ({ sha: c.sha, message: c.commit.message, url: c.html_url });

  if (stable) {
    const compare = await gh.request<{ total_commits: number; commits: ApiCommit[] }>(
      'GET',
      `/repos/${repo.full}/compare/${encodeURIComponent(stable.name)}...${head}?per_page=${COMPARE_LIMIT}`,
    );
    if (compare.total_commits > compare.commits.length) {
      console.warn(`${repo.full}: ${compare.total_commits} commits since ${stable.name}, previewing the oldest`);
    }
    commits = compare.commits.map(toCommit);
  } else {
    const recent = await gh.request<ApiCommit[]>('GET', `/repos/${repo.full}/commits?sha=${head}&per_page=100`);
    commits = recent.map(toCommit).reverse();
  }

  // A merged release PR whose tag is not pushed yet still counts as released.
  for (let i = commits.length - 1; i >= 0; i--) {
    const released = releaseTitleVersion(commits[i]!.message.split('\n')[0] ?? '');
    if (released?.pre === null && compareSemver(released, base) > 0) {
      base = released;
      commits = commits.slice(i + 1);
      break;
    }
  }

  return {
    base,
    baseTag: stable?.name ?? null,
    commits: commits.filter(commit => !releaseTitleVersion(commit.message.split('\n')[0] ?? '')),
  };
}

async function writeReleaseBranch(
  gh: Github,
  repo: RepoRef,
  bumps: FileBump[],
  head: string,
  version: Semver,
  title: string,
): Promise<void> {
  const context = { version, tag: `v${formatSemver(version)}` };
  const byPath = new Map<string, FileBump[]>();
  for (const bump of bumps) {
    if (bump.stableOnly && version.pre) continue;
    byPath.set(bump.path, [...(byPath.get(bump.path) ?? []), bump]);
  }

  const tree: { path: string; mode: '100644'; type: 'blob'; content: string }[] = [];
  for (const [path, list] of byPath) {
    const original = await gh.file(repo.full, path, head);
    if (original === null) throw new Error(`${repo.full}: ${path} does not exist on ${repo.defaultBranch}`);

    const updated = list.reduce((text, bump) => bump.apply(text, context), original);
    if (updated !== original) tree.push({ path, mode: '100644', type: 'blob', content: updated });
  }

  const parent = await gh.request<{ tree: { sha: string } }>('GET', `/repos/${repo.full}/git/commits/${head}`);
  const newTree = await gh.request<{ sha: string }>('POST', `/repos/${repo.full}/git/trees`, {
    base_tree: parent.tree.sha,
    tree,
  });
  const commit = await gh.request<{ sha: string }>('POST', `/repos/${repo.full}/git/commits`, {
    message: title,
    tree: newTree.sha,
    parents: [head],
  });

  try {
    await gh.request('PATCH', `/repos/${repo.full}/git/refs/heads/${RELEASE_BRANCH}`, { sha: commit.sha, force: true });
  } catch (error) {
    if (!(error instanceof GithubApiError) || error.status !== 422) throw error;
    await gh.request('POST', `/repos/${repo.full}/git/refs`, { ref: `refs/heads/${RELEASE_BRANCH}`, sha: commit.sha });
  }
}

async function closeReleasePull(gh: Github, repo: RepoRef, pull: PullRequest): Promise<void> {
  await gh.request('PATCH', `/repos/${repo.full}/pulls/${pull.number}`, { state: 'closed' });
  await gh.request('DELETE', `/repos/${repo.full}/git/refs/heads/${RELEASE_BRANCH}`);
}

function summaryLine(version: Semver, bump: Bump | null, count: number, baseTag: string | null): string {
  const since = baseTag ? `since \`${baseTag}\`` : 'so far';
  const commits = `${count} commit${count === 1 ? '' : 's'} ${since}`;
  const kind = bump ? `a ${bump} release from ${commits}` : `pinned with \`/version\`, ${commits}`;
  return `**v${formatSemver(version)}**${version.pre ? ' (pre-release)' : ''} — ${kind}.`;
}

function introFrom(body: string | null | undefined): string | null {
  if (!body?.includes(GENERATED)) return null;
  return body.slice(0, body.indexOf(GENERATED)).trimEnd();
}

function pinFrom(body: string | null | undefined): Semver | null {
  const match = body ? PIN.exec(body) : null;
  return match ? parseSemver(match[1]!) : null;
}
