import type { PullRequestEvent, PushEvent, WorkflowRunEvent } from '@bx-team/types/schema/github';
import { releaseConfig } from '../config/organisation';
import type { Github } from '../github/client';
import { RELEASE_BRANCH, releaseHeld, type SyncResult, syncReleasePull } from '../release/pull';
import { findRelease, tagRelease } from '../release/ship';
import { parseSemver } from '../release/version';
import { repoRef } from './repo';

/** A push to the default branch of a released repository refreshes its release PR. */
export async function onPush(gh: Github, event: PushEvent): Promise<SyncResult | null> {
  const config = releaseConfig(event.repository.full_name);
  if (!config || event.deleted || event.ref !== `refs/heads/${event.repository.default_branch}`) return null;

  return syncReleasePull(gh, repoRef(event.repository), config, undefined);
}

/** Merging the release PR is what ships: it tags the merge and opens the draft release. */
export async function onReleaseMerged(gh: Github, event: PullRequestEvent): Promise<boolean> {
  const config = releaseConfig(event.repository.full_name);
  const pull = event.pull_request;
  if (!config || event.action !== 'closed' || !pull.merged || pull.head.ref !== RELEASE_BRANCH) return false;

  await tagRelease(gh, repoRef(event.repository), config, pull);
  return true;
}

export interface FailedJob {
  name: string;
  html_url: string;
}

export type ReleaseRun = { state: 'failed'; tag: string; jobs: FailedJob[] } | { state: 'held'; tag: string };

/**
 * Reports how a release workflow run on a `v*` tag ended, on the release PR it shipped from: a
 * failure with the jobs that broke, or a held draft that is ready to be checked. A run started
 * by hand is not reported, since it carries no tag to tell it is a release.
 */
export async function onReleaseRun(gh: Github, event: WorkflowRunEvent): Promise<ReleaseRun | null> {
  const run = event.workflow_run;
  const tag = run.head_branch ?? '';
  if (!releaseConfig(event.repository.full_name) || event.action !== 'completed' || run.event !== 'push') return null;
  if (!tag.startsWith('v') || !parseSemver(tag)) return null;

  const repo = repoRef(event.repository);
  let result: ReleaseRun;
  let message: string;

  if (run.conclusion === 'failure' || run.conclusion === 'timed_out') {
    const { jobs } = await gh.request<{ jobs: (FailedJob & { conclusion: string | null })[] }>(
      'GET',
      `/repos/${repo.full}/actions/runs/${run.id}/attempts/${run.run_attempt}/jobs?per_page=100`,
    );
    const failed = jobs.filter(job => job.conclusion === 'failure' || job.conclusion === 'timed_out');
    result = { state: 'failed', tag, jobs: failed };
    message = [
      `❌ [The release workflow](${run.html_url}) for **${tag}** failed${failed.length ? ':' : '.'}`,
      ...failed.map(job => `- [${job.name}](${job.html_url})`),
      '',
      'The release stays a draft. Fix the cause and re-run the failed jobs from the run.',
    ].join('\n');
  } else if (run.conclusion === 'success') {
    const release = await findRelease(gh, repo, tag);
    if (!release?.draft || !releaseHeld(release.body)) return null;
    result = { state: 'held', tag };
    message = `✅ Every file of **${tag}** is attached. [The draft](${release.html_url}) is waiting for you to check and publish it.`;
  } else {
    return null;
  }

  const pulls = await gh.request<{ number: number; head: { ref: string } }[]>(
    'GET',
    `/repos/${repo.full}/commits/${run.head_sha}/pulls`,
  );
  const pull = pulls.find(candidate => candidate.head.ref === RELEASE_BRANCH);
  if (pull) await gh.request('POST', `/repos/${repo.full}/issues/${pull.number}/comments`, { body: message });
  return result;
}
