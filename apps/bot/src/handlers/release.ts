import type { PullRequestEvent, PushEvent } from '@bx-team/types/schema/github';
import { releaseConfig } from '../config/organisation';
import type { Github } from '../github/client';
import { RELEASE_BRANCH, type SyncResult, syncReleasePull } from '../release/pull';
import { dispatchRelease } from '../release/ship';
import { repoRef } from './repo';

/** A push to the default branch of a released repository refreshes its release PR. */
export async function onPush(gh: Github, event: PushEvent): Promise<SyncResult | null> {
  const config = releaseConfig(event.repository.full_name);
  if (!config || event.deleted || event.ref !== `refs/heads/${event.repository.default_branch}`) return null;

  return syncReleasePull(gh, repoRef(event.repository), config, undefined);
}

/** Merging the release PR is what ships: it dispatches the repository's release workflow. */
export async function onReleaseMerged(gh: Github, event: PullRequestEvent): Promise<boolean> {
  const config = releaseConfig(event.repository.full_name);
  const pull = event.pull_request;
  if (!config || event.action !== 'closed' || !pull.merged || pull.head.ref !== RELEASE_BRANCH) return false;

  await dispatchRelease(gh, repoRef(event.repository), config, pull);
  return true;
}
