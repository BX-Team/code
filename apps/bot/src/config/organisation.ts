import { type Project, projectByRepo } from '@bx-team/projects';

/** The organisation board every new issue and pull request is added to. */
export const ORGANISATION = 'BX-Team';
export const PROJECT_NUMBER = 12;

/** Types a pull request title may start with — the `label_extractor` of `changelog_configuration.json`. */
export const TITLE_TYPES = ['build', 'chore', 'ci', 'docs', 'feat', 'fix', 'perf', 'refactor', 'revert', 'style'];

export type ReleaseConfig = NonNullable<Project['release']>;

/** The release setup of an `owner/name` repository, when the bot keeps a release PR for it. */
export function releaseConfig(repo: string): ReleaseConfig | undefined {
  return projectByRepo(repo)?.release;
}
