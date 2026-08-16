import { RESOURCES } from '../config/resources';

export interface AtlasProject {
  id: string;
  name: string;
  description?: string;
  latestVersion?: string;
}

export interface AtlasProjectResponse {
  project: AtlasProject;
  version_groups: Record<string, string[]>;
}

export interface AtlasDownload {
  name: string;
  checksums: { sha256: string };
  size: number;
  url: string;
}

export interface AtlasBuild {
  id: number;
  time: string;
  channel: 'ALPHA' | 'BETA' | 'STABLE';
  commits: { sha: string; message: string; time: string }[];
  downloads: Record<string, AtlasDownload>;
}

async function get<T>(path: string): Promise<T | null> {
  const response = await fetch(`${RESOURCES.api}${path}`, { headers: { Accept: 'application/json' } });
  if (!response.ok) return null;
  return response.json<T>();
}

export async function listProjects(): Promise<AtlasProjectResponse[]> {
  const body = await get<{ projects: AtlasProjectResponse[] }>('/atlas/projects');
  return body?.projects ?? [];
}

export function getProject(projectKey: string): Promise<AtlasProjectResponse | null> {
  return get<AtlasProjectResponse>(`/atlas/projects/${encodeURIComponent(projectKey)}`);
}

export function getLatestBuild(projectKey: string, versionKey: string): Promise<AtlasBuild | null> {
  return get<AtlasBuild>(
    `/atlas/projects/${encodeURIComponent(projectKey)}/versions/${encodeURIComponent(versionKey)}/builds/latest`,
  );
}

/** Newest version of a project: the explicit `latestVersion`, else the first grouped key. */
export function newestVersion(project: AtlasProjectResponse): string | undefined {
  return project.project.latestVersion ?? Object.values(project.version_groups)[0]?.[0];
}
