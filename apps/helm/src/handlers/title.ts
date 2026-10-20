import type { PullRequestEvent } from '@bx-team/types/schema/github';
import { TITLE_TYPES } from '../config/repositories';
import type { Github } from '../github/client';
import { isConventionalTitle } from '../release/version';

const CHECKED = ['opened', 'edited', 'reopened', 'synchronize'];
export const TITLE_CHECK = 'Conventional title';

/**
 * Reports whether the PR title is a Conventional Commit. It becomes the squash commit and
 * so a line of the release notes, and decides the version bump.
 */
export async function checkTitle(gh: Github, event: PullRequestEvent): Promise<boolean> {
  if (!CHECKED.includes(event.action)) return false;

  const { title, head } = event.pull_request;
  const ok = isConventionalTitle(title, TITLE_TYPES);

  await gh.request('POST', `/repos/${event.repository.full_name}/check-runs`, {
    name: TITLE_CHECK,
    head_sha: head.sha,
    status: 'completed',
    conclusion: ok ? 'success' : 'failure',
    output: ok
      ? { title: 'Title is a Conventional Commit', summary: `\`${title}\`` }
      : {
          title: 'Title is not a Conventional Commit',
          summary: [
            `\`${title}\` does not parse as \`type(scope): summary\`.`,
            `Allowed types: ${TITLE_TYPES.map(type => `\`${type}\``).join(', ')}. Add \`!\` after the type or scope for a breaking change.`,
            'The title becomes the squash commit, so it is what the release notes show and what decides the next version.',
          ].join('\n\n'),
        },
  });
  return true;
}
