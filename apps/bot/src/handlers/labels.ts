import type { PullRequestEvent } from '@bx-team/types/schema/github';
import { TYPE_LABELS } from '../config/organisation';
import { type Github, GithubApiError } from '../github/client';
import { titleType } from '../release/version';

const LABELLED = ['opened', 'reopened', 'edited'];

/**
 * Labels a person's pull request by its title type. A retitle swaps the label the old title
 * gave for the new one; labels put on by hand are never touched.
 */
export async function labelByType(gh: Github, event: PullRequestEvent): Promise<string | false> {
  const pull = event.pull_request;
  if (!LABELLED.includes(event.action) || pull.user.type === 'Bot') return false;

  const previous = event.changes?.title?.from;
  if (event.action === 'edited' && previous === undefined) return false;

  const label = labelFor(pull.title);
  const stale = previous === undefined ? undefined : labelFor(previous);
  const issue = `/repos/${event.repository.full_name}/issues/${pull.number}/labels`;

  if (stale && stale !== label) {
    try {
      await gh.request('DELETE', `${issue}/${encodeURIComponent(stale)}`);
    } catch (error) {
      // Already taken off by hand.
      if (!(error instanceof GithubApiError) || error.status !== 404) throw error;
    }
  }
  if (!label) return false;

  await gh.request('POST', issue, { labels: [label] });
  return label;
}

function labelFor(title: string): string | undefined {
  const type = titleType(title);
  return type ? TYPE_LABELS[type] : undefined;
}
