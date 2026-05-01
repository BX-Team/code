interface ParsedVersion {
  major: number;
  minor: number;
  patch: number;
  preRelease: 'pre' | 'rc' | null;
  preNumber: number;
}

function parseVersion(version: string): ParsedVersion {
  const match = version.match(/^(\d+)\.(\d+)(?:\.(\d+))?(?:-(pre|rc)(\d+))?$/);
  if (!match) return { major: 0, minor: 0, patch: 0, preRelease: null, preNumber: 0 };
  return {
    major: parseInt(match[1], 10) || 0,
    minor: parseInt(match[2], 10) || 0,
    patch: parseInt(match[3], 10) || 0,
    preRelease: (match[4] as 'pre' | 'rc') || null,
    preNumber: parseInt(match[5], 10) || 0,
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

export function groupVersions(versionKeys: string[]): Record<string, string[]> {
  const sorted = [...versionKeys].sort(compareVersions);
  const groups: Record<string, string[]> = {};
  for (const version of sorted) {
    const majorMinor = version.split('.').slice(0, 2).join('.');
    if (!groups[majorMinor]) groups[majorMinor] = [];
    groups[majorMinor].push(version);
  }
  return groups;
}
