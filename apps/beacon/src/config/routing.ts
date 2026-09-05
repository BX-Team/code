const DESTINATIONS = {
  /** Threads in the GitHub forum, one per repository. */
  divinemc: '1332360164870717521',
  ndailyrewards: '1332361121776271360',
  quark: '1408940144014393364',
  irori: '1535312108210618468',
  nyx: '1515539407862632640',
  /** Channel announcing new versions and builds. */
  releases: '1144045902722506752',
} as const;

export const DEFAULT_BRANCH = '@default';

export type GithubEvent = 'push' | 'pull_request' | 'release';

export interface GithubRoute {
  channelId: string;
  /** Branches announced; `DEFAULT_BRANCH` resolves per repository. Omit to allow all. */
  branches?: string[];
  /** Event types this route accepts. Omit to accept every supported event. */
  events?: GithubEvent[];
}

export const GITHUB_ROUTES: Record<string, GithubRoute[]> = {
  'BX-Team/DivineMC': [{ channelId: DESTINATIONS.divinemc }],
  'BX-Team/NDailyRewards': [{ channelId: DESTINATIONS.ndailyrewards }],
  'BX-Team/Quark': [{ channelId: DESTINATIONS.quark }],
  'BX-Team/irori': [{ channelId: DESTINATIONS.irori }],
  'BX-Team/Nyx': [{ channelId: DESTINATIONS.nyx }],
};

/** Keyed by the project key on the downloads API; `*` catches every other project. */
export const PUBLISH_ROUTES: Record<string, string[]> = {
  '*': [DESTINATIONS.releases],
};

/** Channels a publish of `project` is announced in. */
export function publishRoutesFor(project: string): string[] {
  return PUBLISH_ROUTES[project] ?? PUBLISH_ROUTES['*'] ?? [];
}

function lookup<T>(table: Record<string, T[]>, key: string): T[] {
  return table[key] ?? table['*'] ?? [];
}

/** GitHub routes for a repository that accept `event` on `branch`. */
export function githubRoutesFor(repoFullName: string, event: GithubEvent, branch: string, defaultBranch: string) {
  return lookup(GITHUB_ROUTES, repoFullName).filter(route => {
    if (!route.channelId) return false;
    if (route.events && !route.events.includes(event)) return false;
    // Releases are not tied to a branch, so branch filters do not apply to them.
    if (event === 'release' || !route.branches) return true;
    return route.branches.some(allowed => (allowed === DEFAULT_BRANCH ? defaultBranch : allowed) === branch);
  });
}
