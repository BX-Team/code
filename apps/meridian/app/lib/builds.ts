import { GITHUB_URL } from '~/config/links';

const API_ORIGIN = 'https://api.bxteam.org';

export const API_BASE = import.meta.env.VITE_API_BASE || (import.meta.dev ? '' : API_ORIGIN);

const API = `${API_BASE}/v1`;

/** Absolute so a query string can be built before `$fetch` sees it. */
function apiUrl(href: string): URL {
  return new URL(href, import.meta.client ? location.origin : API_ORIGIN);
}

/** The discriminator on `Project`. */
export type ProjectKind = 'versioned' | 'release';
export type Channel = 'alpha' | 'beta' | 'stable';
export type Support = 'supported' | 'deprecated' | 'unsupported';

export interface Page<T> {
  items: T[];
  next: string | null;
}

/** `url` points at the bucket, never at the API. */
export interface Download {
  name: string;
  size: number;
  sha256: string;
  url: string;
}

export interface BuildCommit {
  sha: string;
  summary: string;
  at: string;
}

export interface ProjectSummary {
  key: string;
  name: string;
  kind: ProjectKind;
  description: string | null;
  repo: string | null;
  latest: string | null;
  experimental: string | null;
  updated_at: string | null;
}

/** `kind` says which half is present; the other is absent rather than null. */
export interface Project extends ProjectSummary {
  versions?: string[];
  version_groups?: Record<string, string[]>;
  releases?: string[];
}

export interface VersionSummary {
  version: string;
  support: Support;
  java_min: number | null;
  latest_build: number | null;
  build_count: number;
}

export interface Version extends VersionSummary {
  builds: Page<Build>;
}

export interface Build {
  build: number;
  project: string;
  version: string;
  channel: Channel;
  created_at: string;
  commit: string | null;
  commits: BuildCommit[];
  downloads: Record<string, Download>;
}

export interface Release {
  tag: string;
  project: string;
  channel: Channel;
  created_at: string;
  commit: string | null;
  notes: string | null;
  commits: BuildCommit[];
  downloads: Record<string, Download>;
}

/** Paged: a version has thousands of builds. */
export const BUILDS_PER_PAGE = 25;

export function fetchProjects(): Promise<ProjectSummary[]> {
  return $fetch<ProjectSummary[]>(`${API}/projects`);
}

export function fetchProject(project: string): Promise<Project> {
  return $fetch<Project>(`${API}/projects/${encodeURIComponent(project)}`);
}

export function fetchVersions(project: string): Promise<VersionSummary[]> {
  return $fetch<VersionSummary[]>(`${API}/builds/${encodeURIComponent(project)}`);
}

export function fetchVersion(
  project: string,
  version: string,
  limit = BUILDS_PER_PAGE,
  after?: string,
): Promise<Version> {
  const url = apiUrl(`${API}/builds/${encodeURIComponent(project)}/${encodeURIComponent(version)}`);
  url.searchParams.set('limit', String(limit));
  if (after) url.searchParams.set('after', after);
  return $fetch<Version>(url.toString());
}

export function fetchLatestBuild(project: string, version: string): Promise<Build> {
  return $fetch<Build>(`${API}/builds/${encodeURIComponent(project)}/${encodeURIComponent(version)}/latest`);
}

export function fetchBuild(project: string, version: string, build: number): Promise<Build> {
  return $fetch<Build>(`${API}/builds/${encodeURIComponent(project)}/${encodeURIComponent(version)}/${build}`);
}

export function fetchReleases(project: string): Promise<Release[]> {
  return $fetch<Release[]>(`${API}/releases/${encodeURIComponent(project)}`);
}

export function fetchLatestRelease(project: string): Promise<Release> {
  return $fetch<Release>(`${API}/releases/${encodeURIComponent(project)}/latest`);
}

export function fetchRelease(project: string, tag: string): Promise<Release> {
  return $fetch<Release>(`${API}/releases/${encodeURIComponent(project)}/${encodeURIComponent(tag)}`);
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
  switch (channel?.toLowerCase()) {
    case 'alpha':
      return 'channel-alpha';
    case 'beta':
      return 'channel-beta';
    case 'stable':
      return 'channel-stable';
    default:
      return 'channel-default';
  }
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
