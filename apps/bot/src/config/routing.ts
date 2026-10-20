import { projectByRepo } from '@bx-team/projects';

/** Where every new build and release is announced. */
export const RELEASES_CHANNEL = '1144045902722506752';

/** The thread an `owner/name` repository's activity is posted into, when it has one. */
export function activityChannel(repo: string): string | undefined {
  return projectByRepo(repo)?.discord;
}
