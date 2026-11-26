import { type Project, projectByRepo } from '@bx-team/projects';

/** The organisation board every new issue and pull request is added to. */
export const ORGANISATION = 'BX-Team';
export const PROJECT_NUMBER = 12;

/** The board's Status options for closed items: finished work, and everything closed without it. */
export const STATUS_DONE = 'Done';
export const STATUS_REJECTED = 'Closed/Rejected';

/** Types a pull request title may start with — the `label_extractor` of the changelog configuration. */
export const TITLE_TYPES = ['build', 'chore', 'ci', 'docs', 'feat', 'fix', 'perf', 'refactor', 'revert', 'style'];

/** From the organisation's `labels.json`; types without one leave the labels alone. */
export const TYPE_LABELS: Record<string, string> = {
  feat: '🔧 enhancement',
  fix: '🐛 bug',
  perf: '⚡ performance',
  refactor: '🧹 refactor',
  docs: '📝 documentation',
  ci: '⚙️ ci',
};

/** Put on every release PR; the same entry is in the organisation's `labels.json`. */
export const RELEASE_LABEL = '🚀 release';

/** Asks the pull request's CI to upload its build, and the bot to comment with the downloads. */
export const ARTIFACTS_LABEL = '📦 upload artifacts';

/** Where the changelog grouping lives; the second path is the layout before `.github/release/`. */
export const CHANGELOG_PATHS = ['.github/release/changelog.json', '.github/changelog_configuration.json'];

/** A project's release setup plus its display name, which titles the tag and the release. */
export type ReleaseConfig = NonNullable<Project['release']> & { name: string };

export function releaseConfig(repo: string): ReleaseConfig | undefined {
  const project = projectByRepo(repo);
  return project?.release ? { ...project.release, name: project.name } : undefined;
}
