// Supports both Minecraft version schemes:
//   - legacy:  1.X[.Y]      (e.g. 1.20, 1.20.1, 1.21.7-pre1)
//   - modern:  XX.Y[.Z]     (e.g. 26.1, 26.1.2, 26.2-rc1)
// Newer versions sort before older ones; pre-release < rc < release.

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
  const n = parseInt(value, 10);
  return Number.isNaN(n) ? 0 : n;
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

function compareVersions(a: string, b: string): number {
  const vA = parseVersion(a);
  const vB = parseVersion(b);
  if (vA.major !== vB.major) return vB.major - vA.major;
  if (vA.minor !== vB.minor) return vB.minor - vA.minor;
  if (vA.patch !== vB.patch) return vB.patch - vA.patch;
  if (vA.preRelease === null && vB.preRelease !== null) return -1;
  if (vA.preRelease !== null && vB.preRelease === null) return 1;
  if (vA.preRelease !== vB.preRelease) {
    if (vA.preRelease === 'rc' && vB.preRelease === 'pre') return -1;
    if (vA.preRelease === 'pre' && vB.preRelease === 'rc') return 1;
  }
  return vB.preNumber - vA.preNumber;
}

// Group key: `major.minor`. For 1.20.1 → "1.20"; for 26.1.2 → "26.1".
// 26.1 and 26.1.2 land in the same group; 26.2 is its own group.
export function groupVersions(versionKeys: string[]): Record<string, string[]> {
  const sorted = [...versionKeys].sort(compareVersions);
  const groups: Record<string, string[]> = {};
  for (const version of sorted) {
    const { major, minor } = parseVersion(version);
    const key = `${major}.${minor}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(version);
  }
  return groups;
}
