import { cargoLock, cargoManifest, type FileBump, replace } from '../release/files';

/** The organisation board every new issue and pull request is added to. */
export const ORGANISATION = 'BX-Team';
export const PROJECT_NUMBER = 12;

/** Types a pull request title may start with — the `label_extractor` of `changelog_configuration.json`. */
export const TITLE_TYPES = ['build', 'chore', 'ci', 'docs', 'feat', 'fix', 'perf', 'refactor', 'revert', 'style'];

export interface ReleaseConfig {
  /** The repository's release workflow; it is dispatched with `version`, `sha`, `description`, `prerelease`. */
  workflow: string;
  /** Every file that carries the version, rewritten in the release PR. */
  files: FileBump[];
}

/**
 * Repositories that get a release PR, keyed by `owner/name`. Adding one is a config change
 * reviewed here, together with the matching `sha` input on its release workflow.
 */
export const RELEASES: Record<string, ReleaseConfig> = {
  'BX-Team/Riven': {
    workflow: 'release.yml',
    files: [
      cargoManifest(),
      cargoLock(),
      replace('README.md', [{ pattern: /github:BX-Team\/Riven\/v[^\s`]*/, with: 'github:BX-Team/Riven/{tag}' }], {
        stableOnly: true,
      }),
      replace(
        'README.md',
        [
          { pattern: /releases\/download\/v[^/]+\//, with: 'releases/download/{tag}/' },
          { pattern: /riven_[^_]+_(amd64|arm64)\.deb/, with: 'riven_{version}_$1.deb' },
          { pattern: /riven-[^-]+-1\.(x86_64|aarch64)\.rpm/, with: 'riven-{version}-1.$1.rpm' },
          { pattern: /riven-[^-]+-1-x86_64\.pkg/, with: 'riven-{version}-1-x86_64.pkg' },
        ],
        { between: ['<!-- downloads -->', '<!-- /downloads -->'], stableOnly: true },
      ),
    ],
  },
};
