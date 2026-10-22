export interface Semver {
  major: number;
  minor: number;
  patch: number;
  pre: string | null;
}

export type Bump = 'major' | 'minor' | 'patch';

const SEMVER = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/;
const TITLE = /^(\w+)(?:\([^)]*\))?(!)?: \S/;
/** Both the release PR title and the old `release.yml` bump commit. */
const RELEASE_TITLE = /^chore\(release\): (?:bump version to )?v?(\S+)$/;

export function parseSemver(text: string): Semver | null {
  const match = SEMVER.exec(text.trim());
  if (!match) return null;
  return { major: +match[1]!, minor: +match[2]!, patch: +match[3]!, pre: match[4] ?? null };
}

export function formatSemver(version: Semver): string {
  const core = `${version.major}.${version.minor}.${version.patch}`;
  return version.pre ? `${core}-${version.pre}` : core;
}

export function compareSemver(a: Semver, b: Semver): number {
  const core = a.major - b.major || a.minor - b.minor || a.patch - b.patch;
  if (core !== 0) return core;
  if (a.pre === b.pre) return 0;
  if (a.pre === null) return 1;
  if (b.pre === null) return -1;
  return comparePre(a.pre, b.pre);
}

function comparePre(a: string, b: string): number {
  const left = a.split('.');
  const right = b.split('.');
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    const x = left[i];
    const y = right[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    const numeric = /^\d+$/.test(x) && /^\d+$/.test(y);
    const order = numeric ? +x - +y : x.localeCompare(y);
    if (order !== 0) return order;
  }
  return 0;
}

/** The version a release commit or release PR title names, or null for any other title. */
export function releaseTitleVersion(title: string): Semver | null {
  const match = RELEASE_TITLE.exec(title.trim());
  return match ? parseSemver(match[1]!) : null;
}

export function releaseTitle(version: Semver): string {
  return `chore(release): ${formatSemver(version)}`;
}

/** The type of a Conventional Commit title — `feat` of `feat(gui)!: …` — or null when it is not one. */
export function titleType(title: string): string | null {
  return TITLE.exec(title)?.[1] ?? null;
}

export function isConventionalTitle(title: string, types: readonly string[]): boolean {
  const match = TITLE.exec(title);
  return match !== null && types.includes(match[1]!);
}

/** The strongest bump the commits ask for: `!` or a `BREAKING CHANGE` footer, `feat`, then `fix`/`perf`. */
export function bumpFor(messages: string[]): Bump | null {
  let bump: Bump | null = null;

  for (const message of messages) {
    const title = message.split('\n')[0] ?? '';
    const match = TITLE.exec(title);
    if (!match) continue;

    if (match[2] || /^BREAKING[ -]CHANGE: /m.test(message)) return 'major';
    if (match[1] === 'feat') bump = 'minor';
    else if ((match[1] === 'fix' || match[1] === 'perf') && bump === null) bump = 'patch';
  }

  return bump;
}

/** Applies a bump to a stable base; before 1.0 a breaking change only moves the minor. */
export function nextVersion(base: Semver, bump: Bump): Semver {
  const effective = bump === 'major' && base.major === 0 ? 'minor' : bump;

  switch (effective) {
    case 'major':
      return { major: base.major + 1, minor: 0, patch: 0, pre: null };
    case 'minor':
      return { major: base.major, minor: base.minor + 1, patch: 0, pre: null };
    case 'patch':
      return { major: base.major, minor: base.minor, patch: base.patch + 1, pre: null };
  }
}
