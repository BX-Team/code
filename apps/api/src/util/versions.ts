// Legacy 1.X[.Y] (1.21.7-pre1) and modern XX.Y[.Z] (26.2-rc1); newest first, pre < rc < release.

interface ParsedVersion {
  major: number;
  minor: number;
  patch: number;
  preRelease: 'pre' | 'rc' | null;
  preNumber: number;
}

const VERSION_RE = /^(\d+)\.(\d+)(?:\.(\d+))?(?:-(pre|rc)(\d+))?$/;

function toInt(value: string | undefined): number {
  if (!value) return 0;
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function parseVersion(version: string): ParsedVersion {
  const match = version.match(VERSION_RE);
  if (!match) return { major: 0, minor: 0, patch: 0, preRelease: null, preNumber: 0 };
  return {
    major: toInt(match[1]),
    minor: toInt(match[2]),
    patch: toInt(match[3]),
    preRelease: (match[4] as 'pre' | 'rc' | undefined) ?? null,
    preNumber: toInt(match[5]),
  };
}

export function newestFirst(a: string, b: string): number {
  const left = parseVersion(a);
  const right = parseVersion(b);
  if (left.major !== right.major) return right.major - left.major;
  if (left.minor !== right.minor) return right.minor - left.minor;
  if (left.patch !== right.patch) return right.patch - left.patch;
  if (left.preRelease === null && right.preRelease !== null) return -1;
  if (left.preRelease !== null && right.preRelease === null) return 1;
  if (left.preRelease !== right.preRelease) {
    if (left.preRelease === 'rc' && right.preRelease === 'pre') return -1;
    if (left.preRelease === 'pre' && right.preRelease === 'rc') return 1;
  }
  return right.preNumber - left.preNumber;
}

export function sortNewestFirst(versionKeys: string[]): string[] {
  return [...versionKeys].sort(newestFirst);
}

/** By `major.minor`: 1.20.1 → 1.20, 26.1.2 → 26.1. */
export function groupVersions(versionKeys: string[]): Record<string, string[]> {
  const groups: Record<string, string[]> = {};
  for (const version of sortNewestFirst(versionKeys)) {
    const { major, minor } = parseVersion(version);
    const key = `${major}.${minor}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(version);
  }
  return groups;
}
