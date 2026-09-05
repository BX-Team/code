import { RESOURCES } from '../config/resources';

export type ProjectKind = 'versioned' | 'release';
export type Channel = 'alpha' | 'beta' | 'stable';

export interface ProjectSummary {
  key: string;
  name: string;
  kind: ProjectKind;
  description: string | null;
  /** The GitHub repository the project is built from, when it has one. */
  repo: string | null;
  latest: string | null;
  experimental: string | null;
  updated_at: string | null;
}

/** `kind` says which half is present; the other is absent rather than null. */
export interface Project extends ProjectSummary {
  versions?: string[];
  releases?: string[];
}

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

/**
 * `no-cache` matters on the read-back after a publish: azimuth edge-caches its public
 * GETs, and an announcement must not describe the build before this one.
 */
async function get<T>(path: string): Promise<T | null> {
  const response = await fetch(`${RESOURCES.api}${path}`, {
    headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' },
  });
  if (!response.ok) return null;
  return response.json<T>();
}

const slug = (value: string) => encodeURIComponent(value);

export function listProjects(): Promise<ProjectSummary[] | null> {
  return get<ProjectSummary[]>('/projects');
}

export function getProject(project: string): Promise<Project | null> {
  return get<Project>(`/projects/${slug(project)}`);
}

export function getBuild(project: string, version: string, build: number): Promise<Build | null> {
  return get<Build>(`/builds/${slug(project)}/${slug(version)}/${build}`);
}

export function getLatestBuild(project: string, version: string): Promise<Build | null> {
  return get<Build>(`/builds/${slug(project)}/${slug(version)}/latest`);
}

export function getRelease(project: string, tag: string): Promise<Release | null> {
  return get<Release>(`/releases/${slug(project)}/${slug(tag)}`);
}

export function getLatestRelease(project: string): Promise<Release | null> {
  return get<Release>(`/releases/${slug(project)}/latest`);
}

/** A publish uploads whatever its workflow handed over: `application` when there is one. */
export function primaryDownload(downloads: Record<string, Download>): Download | undefined {
  return downloads.application ?? Object.values(downloads)[0];
}
