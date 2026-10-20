import type { IssueCommentEvent } from '@bx-team/types/schema/github';
import { RELEASES } from '../config/repositories';
import type { Github } from '../github/client';
import { type PullRequest, RELEASE_BRANCH, syncReleasePull } from '../release/pull';
import { mergeRelease } from '../release/ship';
import { parseSemver } from '../release/version';
import { CommandError } from '../util/error';
import { repoRef } from './repo';

const COMMAND = /^\/(release|version)(?:[ \t]+(\S+))?[ \t]*$/;
const ALLOWED = ['admin', 'write'];

type Reaction = '+1' | 'rocket' | 'confused';

/**
 * `/release` and `/version` on a release PR, from anyone with write access. A command error
 * is answered on the PR rather than failing the delivery — nothing a redelivery would fix.
 */
export async function onComment(gh: Github, event: IssueCommentEvent): Promise<boolean> {
  const config = RELEASES[event.repository.full_name];
  if (!config || event.action !== 'created' || !event.issue.pull_request || event.comment.user.type === 'Bot') {
    return false;
  }

  const match = COMMAND.exec(event.comment.body.split('\n')[0]!.trim());
  if (!match) return false;

  const repo = repoRef(event.repository);
  const react = (content: Reaction) =>
    gh.request('POST', `/repos/${repo.full}/issues/comments/${event.comment.id}/reactions`, { content });

  try {
    const { permission } = await gh.request<{ permission: string }>(
      'GET',
      `/repos/${repo.full}/collaborators/${encodeURIComponent(event.comment.user.login)}/permission`,
    );
    if (!ALLOWED.includes(permission))
      throw new CommandError('Only people with write access can run release commands.');

    const pull = await gh.request<PullRequest>('GET', `/repos/${repo.full}/pulls/${event.issue.number}`);
    if (pull.head.ref !== RELEASE_BRANCH)
      throw new CommandError(`Release commands only work on the \`${RELEASE_BRANCH}\` pull request.`);

    const [, command, argument] = match;
    if (command === 'release') {
      if (argument)
        throw new CommandError('`/release` takes no argument; pick the version with `/version <x.y.z>` first.');
      const result = await mergeRelease(gh, repo, pull);
      await react(result === 'merged' ? 'rocket' : '+1');
      if (result === 'queued') {
        await reply(
          gh,
          repo.full,
          event.issue.number,
          'Auto-merge is on: this merges and ships once the required checks pass.',
        );
      }
      return true;
    }

    if (!argument) throw new CommandError('Usage: `/version <x.y.z>` or `/version auto`.');
    const pin = argument === 'auto' ? null : parseSemver(argument);
    if (pin === null && argument !== 'auto') throw new CommandError(`\`${argument}\` is not a semantic version.`);

    await syncReleasePull(gh, repo, config, pin, true);
    await react('+1');
    return true;
  } catch (error) {
    if (!(error instanceof CommandError)) throw error;
    await react('confused');
    await reply(gh, repo.full, event.issue.number, `> ${event.comment.body.split('\n')[0]}\n\n${error.message}`);
    return true;
  }
}

async function reply(gh: Github, repo: string, number: number, body: string): Promise<void> {
  await gh.request('POST', `/repos/${repo}/issues/${number}/comments`, { body });
}
