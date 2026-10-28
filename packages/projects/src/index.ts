/** A file that carries the version, rewritten by the bot on the release PR. */
export type VersionFile =
  /** The `version` of `[workspace.package]`, or of `[package]` in a single-crate repository. */
  | { kind: 'cargo-manifest'; path?: string }
  /** Every `[[package]]` without a `source` — the workspace's own crates. */
  | { kind: 'cargo-lock'; path?: string }
  /**
   * Regex rewrites, optionally confined to the text between two marker lines; every pattern
   * must match. `{version}` and `{tag}` are substituted into `with`.
   */
  | {
      kind: 'replace';
      path: string;
      replacements: { pattern: RegExp; with: string }[];
      between?: [string, string];
      /** Left untouched for a pre-release — install instructions keep pointing at the last stable one. */
      stableOnly?: boolean;
    };

export interface Project {
  /** The key on the downloads API, and the slug of `/<key>`, `/docs/<key>` and `/downloads/<key>`. */
  key: string;
  name: string;
  /** `owner/name` on GitHub. */
  repo: string;
  /** Has a section under `apps/web/content/docs/<key>`; the web build fails when the two disagree. */
  docs?: boolean;
  /** The Discord channel — usually a GitHub forum thread — repository activity is posted into. */
  discord?: string;
  /**
   * The bot keeps a release PR open for the repository and, when it is merged, tags the merge
   * and opens the draft release; the repository's workflow builds from the tag push.
   */
  release?: { files: VersionFile[] };
}

/** Every BX Team project the site, the bot and the API agree on. Adding one starts here. */
export const PROJECTS: Project[] = [
  {
    key: 'divinemc',
    name: 'DivineMC',
    repo: 'BX-Team/DivineMC',
    docs: true,
    discord: '1332360164870717521',
  },
  {
    key: 'quark',
    name: 'Quark',
    repo: 'BX-Team/Quark',
    docs: true,
    discord: '1408940144014393364',
  },
  {
    key: 'ndailyrewards',
    name: 'NDailyRewards',
    repo: 'BX-Team/NDailyRewards',
    docs: true,
    discord: '1332361121776271360',
  },
  {
    key: 'riven',
    name: 'Riven',
    repo: 'BX-Team/Riven',
    docs: true,
    discord: '1560609756736127006',
    release: {
      files: [
        { kind: 'cargo-manifest' },
        { kind: 'cargo-lock' },
        {
          kind: 'replace',
          path: 'README.md',
          replacements: [{ pattern: /github:BX-Team\/Riven\/v[^\s`]*/, with: 'github:BX-Team/Riven/{tag}' }],
          stableOnly: true,
        },
      ],
    },
  },
  {
    key: 'nyx',
    name: 'Nyx',
    repo: 'BX-Team/Nyx',
    discord: '1515539407862632640',
    release: {
      files: [{ kind: 'cargo-manifest' }, { kind: 'cargo-lock' }],
    },
  },
];

export function findProject(key: string): Project | undefined {
  return PROJECTS.find(project => project.key === key);
}

export function projectByRepo(repo: string): Project | undefined {
  return PROJECTS.find(project => project.repo === repo);
}
