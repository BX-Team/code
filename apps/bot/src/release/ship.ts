import type { ReleaseConfig } from '../config/organisation';
import { type Github, GithubApiError } from '../github/client';
import { CommandError } from '../util/error';
import { type PullRequest, type RepoRef, releaseIntro } from './pull';
import { formatSemver, releaseTitleVersion } from './version';

/**
 * Starts the repository's release workflow for a merged release PR. The workflow tags
 * `sha`, the merge commit, so a push landing in between cannot end up in the release.
 */
export async function dispatchRelease(
  gh: Github,
  repo: RepoRef,
  config: ReleaseConfig,
  pull: { number: number; title: string; body?: string | null; merge_commit_sha?: string | null },
): Promise<void> {
  const version = releaseTitleVersion(pull.title);
  if (!version || !pull.merge_commit_sha) throw new Error(`${repo.full}#${pull.number} is not a release merge`);

  const tag = `v${formatSemver(version)}`;
  await gh.request('POST', `/repos/${repo.full}/actions/workflows/${config.workflow}/dispatches`, {
    ref: repo.defaultBranch,
    inputs: {
      version: formatSemver(version),
      sha: pull.merge_commit_sha,
      description: releaseIntro(pull.body),
      prerelease: String(version.pre !== null),
    },
  });

  await gh.request('POST', `/repos/${repo.full}/issues/${pull.number}/comments`, {
    body: `🚀 Started [the release workflow](https://github.com/${repo.full}/actions/workflows/${config.workflow}) for **${tag}**.`,
  });
}

/**
 * Squash-merges the release PR now if it is mergeable, or turns on auto-merge so GitHub
 * merges it the moment the required checks pass.
 */
export async function mergeRelease(gh: Github, repo: RepoRef, pull: PullRequest): Promise<'merged' | 'queued'> {
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
