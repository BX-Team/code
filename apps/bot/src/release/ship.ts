import type { ReleaseConfig } from '../config/organisation';
import { type Github, GithubApiError } from '../github/client';
import { CommandError } from '../util/error';
import { HOLD, type PullRequest, type RepoRef, releaseHeld, releaseIntro, releaseNotesFrom, withHold } from './pull';
import { formatSemver, releaseTitleVersion } from './version';

interface MergedPull {
  number: number;
  title: string;
  body?: string | null;
  merge_commit_sha?: string | null;
}

interface Release {
  id: number;
  tag_name: string;
  draft: boolean;
  html_url: string;
  body: string | null;
}

/**
 * Ships a merged release PR: the draft release first, then the `v*` tag on the merge commit.
 * The tag push, made with the app's token, is what starts the repository's release workflow.
 * Safe to redeliver: an existing draft is updated, and a tag already on the merge commit is kept.
 */
export async function tagRelease(gh: Github, repo: RepoRef, config: ReleaseConfig, pull: MergedPull): Promise<void> {
  const version = releaseTitleVersion(pull.title);
  if (!version || !pull.merge_commit_sha) throw new Error(`${repo.full}#${pull.number} is not a release merge`);

  const tag = `v${formatSemver(version)}`;
  const name = `${config.name} ${formatSemver(version)}`;
  const held = releaseHeld(pull.body);
  const body = [releaseIntro(pull.body), releaseNotesFrom(pull.body), held ? HOLD : ''].filter(Boolean).join('\n\n');

  // The draft goes first, so the workflow the tag starts always finds it.
  const draft = await ensureDraft(gh, repo, {
    tag_name: tag,
    target_commitish: pull.merge_commit_sha,
    name,
    body,
    prerelease: version.pre !== null,
  });

  const tagged = await ensureTag(gh, repo, tag, pull.merge_commit_sha, name);
  const ending = held
    ? `attaches every file to [the draft](${draft.html_url}) and leaves it for you to check and publish.`
    : `publishes [the draft](${draft.html_url}) once every file is attached.`;
  const message = tagged
    ? `🏷️ Tagged **${tag}** on ${pull.merge_commit_sha.slice(0, 7)}. The release workflow builds from the tag and ${ending}`
    : `⚠️ **${tag}** already exists on another commit, so nothing was tagged. Delete the stray tag and redeliver this webhook, or release under another version.`;

  await gh.request('POST', `/repos/${repo.full}/issues/${pull.number}/comments`, { body: message });
}

/** Creates the draft for `tag`, or rewrites it when a redelivery or the workflow made it first. */
async function ensureDraft(
  gh: Github,
  repo: RepoRef,
  release: { tag_name: string; target_commitish: string; name: string; body: string; prerelease: boolean },
): Promise<Release> {
  const existing = await findRelease(gh, repo, release.tag_name);

  if (!existing) {
    return gh.request<Release>('POST', `/repos/${repo.full}/releases`, { ...release, draft: true });
  }
  if (!existing.draft) return existing;
  return gh.request<Release>('PATCH', `/repos/${repo.full}/releases/${existing.id}`, {
    name: release.name,
    body: release.body,
    prerelease: release.prerelease,
  });
}

/** The release for `tag`, draft or not. */
export async function findRelease(gh: Github, repo: RepoRef, tag: string): Promise<Release | undefined> {
  // Drafts are invisible to `/releases/tags/{tag}`, so they are found by listing.
  const recent = await gh.request<Release[]>('GET', `/repos/${repo.full}/releases?per_page=30`);
  return recent.find(candidate => candidate.tag_name === tag);
}

/** Creates the annotated tag; false when the name is already taken by another commit. */
async function ensureTag(gh: Github, repo: RepoRef, tag: string, sha: string, message: string): Promise<boolean> {
  const current = await taggedCommit(gh, repo, tag);
  if (current !== null) return current === sha;

  const object = await gh.request<{ sha: string }>('POST', `/repos/${repo.full}/git/tags`, {
    tag,
    message,
    object: sha,
    type: 'commit',
  });
  await gh.request('POST', `/repos/${repo.full}/git/refs`, { ref: `refs/tags/${tag}`, sha: object.sha });
  return true;
}

async function taggedCommit(gh: Github, repo: RepoRef, tag: string): Promise<string | null> {
  try {
    const ref = await gh.request<{ object: { sha: string; type: string } }>(
      'GET',
      `/repos/${repo.full}/git/ref/tags/${encodeURIComponent(tag)}`,
    );
    if (ref.object.type === 'commit') return ref.object.sha;
    const annotated = await gh.request<{ object: { sha: string } }>(
      'GET',
      `/repos/${repo.full}/git/tags/${ref.object.sha}`,
    );
    return annotated.object.sha;
  } catch (error) {
    if (error instanceof GithubApiError && error.status === 404) return null;
    throw error;
  }
}

/**
 * Squash-merges the release PR now if it is mergeable, or turns on auto-merge so GitHub
 * merges it the moment the required checks pass. `hold` marks the release to stay a draft.
 */
export async function mergeRelease(
  gh: Github,
  repo: RepoRef,
  pull: PullRequest,
  hold: boolean,
): Promise<'merged' | 'queued'> {
  if (releaseHeld(pull.body) !== hold) {
    await gh.request('PATCH', `/repos/${repo.full}/pulls/${pull.number}`, { body: withHold(pull.body, hold) });
  }

  try {
    await gh.request('PUT', `/repos/${repo.full}/pulls/${pull.number}/merge`, {
      merge_method: 'squash',
      commit_title: pull.title,
      commit_message: '',
      sha: pull.head.sha,
    });
    return 'merged';
  } catch (error) {
    // 405: not mergeable yet, almost always because the required checks are still running.
    if (!(error instanceof GithubApiError) || error.status !== 405) throw error;
  }

  try {
    await gh.graphql(
      `mutation($id: ID!, $title: String!) {
        enablePullRequestAutoMerge(input: { pullRequestId: $id, mergeMethod: SQUASH, commitHeadline: $title, commitBody: "" }) {
          clientMutationId
        }
      }`,
      { id: pull.node_id, title: pull.title },
    );
    return 'queued';
  } catch (error) {
    if (error instanceof GithubApiError) {
      throw new CommandError(`Could not merge or queue the merge: ${error.message}`);
    }
    throw error;
  }
}

/** Undoes a `/release` that is still waiting on checks: auto-merge goes off, and so does the hold. */
export async function cancelRelease(gh: Github, repo: RepoRef, pull: PullRequest): Promise<void> {
  if (pull.state !== 'open' || !pull.auto_merge) {
    throw new CommandError('Nothing to cancel: auto-merge is not on for this pull request.');
  }

  await gh.graphql(
    `mutation($id: ID!) {
      disablePullRequestAutoMerge(input: { pullRequestId: $id }) { clientMutationId }
    }`,
    { id: pull.node_id },
  );
  if (releaseHeld(pull.body)) {
    await gh.request('PATCH', `/repos/${repo.full}/pulls/${pull.number}`, { body: withHold(pull.body, false) });
  }
}
