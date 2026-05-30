// Minecraft/plugin version comparison, mirroring meridian's version-utils ordering:
//   legacy 1.X[.Y] and modern XX.Y[.Z], with pre < rc < release.
// Used for regression detection — a resolved issue reopens only when it recurs on a
// version strictly newer than the one it was fixed in.

const VERSION_RE = /^(\d+)\.(\d+)(?:\.(\d+))?(?:-(pre|rc)(\d+))?$/;

interface Parsed {
  major: number;
  minor: number;
  patch: number;
  preRank: number;
  preNumber: number;
}

function toInt(value: string | undefined): number {
  if (!value) return 0;
  const n = Number.parseInt(value, 10);
  return Number.isNaN(n) ? 0 : n;
}

function parse(version: string): Parsed | null {
  const match = version.match(VERSION_RE);
  if (!match) return null;
  // release (no suffix) ranks highest, then rc, then pre.
  const preRank = match[4] === 'rc' ? 2 : match[4] === 'pre' ? 1 : 3;
  return {
    major: toInt(match[1]),
    minor: toInt(match[2]),
    patch: toInt(match[3]),
    preRank,
    preNumber: toInt(match[5]),
  };
}

/** True when `a` is a strictly newer version than `b`. Unparseable input compares as not-newer. */
export function isNewerVersion(a: string, b: string): boolean {
  const pa = parse(a);
  const pb = parse(b);
  if (!pa || !pb) return false;
  if (pa.major !== pb.major) return pa.major > pb.major;
  if (pa.minor !== pb.minor) return pa.minor > pb.minor;
  if (pa.patch !== pb.patch) return pa.patch > pb.patch;
  if (pa.preRank !== pb.preRank) return pa.preRank > pb.preRank;
  return pa.preNumber > pb.preNumber;
}
