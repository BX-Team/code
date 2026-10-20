import type { ApiContract } from '@bx-team/types/api';
import type { Download, ProjectSummary } from '@bx-team/types/schema/downloads';
import { hc, parseResponse } from 'hono/client';
import { GITHUB_URL } from '~/config/links';

export type {
  Build,
  Channel,
  Commit as BuildCommit,
  Download,
  Project,
  ProjectKind,
  ProjectSummary,
  Release,
  Support,
  Version,
  VersionSummary,
} from '@bx-team/types/schema/downloads';

const API_ORIGIN = 'https://api.bxteam.org';

export const API_BASE = import.meta.env.VITE_API_BASE || (import.meta.dev ? '' : API_ORIGIN);

/** Typed off the API's own route table; in dev an empty base goes through the Nitro proxy. */
const api = hc<ApiContract>(API_BASE || (import.meta.client ? location.origin : API_ORIGIN)).v1;

/** Paged: a version has thousands of builds. */
export const BUILDS_PER_PAGE = 25;

export function fetchProjects() {
  return parseResponse(api.projects.$get());
}

export function fetchProject(project: string) {
  return parseResponse(api.projects[':project'].$get({ param: { project } }));
}

export function fetchVersions(project: string) {
  return parseResponse(api.builds[':project'].$get({ param: { project } }));
}

export function fetchVersion(project: string, version: string, limit = BUILDS_PER_PAGE, after?: string) {
  return parseResponse(
    api.builds[':project'][':version'].$get({
      param: { project, version },
      query: after ? { limit: String(limit), after } : { limit: String(limit) },
    }),
  );
}

export function fetchLatestBuild(project: string, version: string) {
  return parseResponse(api.builds[':project'][':version'].latest.$get({ param: { project, version } }));
}

export function fetchBuild(project: string, version: string, build: number) {
  return parseResponse(
    api.builds[':project'][':version'][':build'].$get({ param: { project, version, build: String(build) } }),
  );
}

export function fetchReleases(project: string) {
  return parseResponse(api.releases[':project'].$get({ param: { project } }));
}

export function fetchLatestRelease(project: string) {
  return parseResponse(api.releases[':project'].latest.$get({ param: { project } }));
}

export function fetchRelease(project: string, tag: string) {
  return parseResponse(api.releases[':project'][':tag'].$get({ param: { project, tag } }));
}

/** A publish uploads whatever its workflow handed over, so there is no fixed download:
 *  `application` when there is one, else the ordered map's first key. */
export function primaryDownload(downloads: Record<string, Download>): Download | undefined {
  return downloads.application ?? Object.values(downloads)[0];
}

export function downloadEntries(downloads: Record<string, Download>): [string, Download][] {
  return Object.entries(downloads);
}

/** Sources live on GitHub, so a commit links there; `repo` is the repository's name. */
export function commitUrl(project: ProjectSummary, sha: string): string {
  return `${GITHUB_URL}/${project.repo ?? project.name}/commit/${sha}`;
}

export function repoUrl(project: ProjectSummary): string {
  return `${GITHUB_URL}/${project.repo ?? project.name}`;
}

export function getChannelColor(channel: string): string {
  const c = channel?.toLowerCase();
  return c === 'stable' || c === 'beta' || c === 'alpha' ? `bx-channel--${c}` : '';
}

export function getAllVersions(versionGroups?: Record<string, string[]>): string[] {
  return Object.values(versionGroups ?? {}).flat();
}

export function getOrderedVersionGroups(versionGroups?: Record<string, string[]>): [string, string[]][] {
  return Object.entries(versionGroups ?? {}).sort((a, b) => {
    const [aMajor = 0, aMinor = 0] = a[0].split('.').map(p => parseInt(p, 10) || 0);
    const [bMajor = 0, bMinor = 0] = b[0].split('.').map(p => parseInt(p, 10) || 0);
    if (aMajor !== bMajor) return bMajor - aMajor;
    return bMinor - aMinor;
  });
}
