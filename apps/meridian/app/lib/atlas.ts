export interface Project {
  id: string;
  name: string;
  description?: string;
  latestVersion: string;
  experimentalVersion?: string;
}

export interface ProjectWithVersions {
  project: Project;
  version_groups: Record<string, string[]>;
}

export interface JavaVersion {
  version: {
    minimum: number;
  };
}

export interface SupportStatus {
  status: 'SUPPORTED' | 'DEPRECATED' | 'UNSUPPORTED';
}

export interface Version {
  id: string;
  java: JavaVersion;
  support: SupportStatus;
}

export interface VersionWithBuilds {
  version: Version;
  builds: number[];
}

export interface Commit {
  sha: string;
  message: string;
  time: string;
}

export interface Download {
  name: string;
  checksums: {
    sha256: string;
  };
  size: number;
  url: string;
}

export interface Build {
  id: number;
  time: string;
  channel: 'ALPHA' | 'BETA' | 'STABLE';
  commits: Commit[];
  downloads: {
    application: Download;
  };
}

export interface ProjectGroup extends ProjectWithVersions {
  latestBuild?: Build;
}

export interface ProjectsResponse {
  projects: ProjectWithVersions[];
}

const ATLAS_API_BASE = 'https://api.bxteam.org/v2';

export async function fetchProjects(): Promise<ProjectsResponse> {
  const response = await fetch(`${ATLAS_API_BASE}/projects`);
  if (!response.ok) {
    throw new Error(`Failed to fetch projects: ${response.statusText}`);
  }
  return response.json();
}

export async function fetchProject(projectId: string): Promise<ProjectWithVersions> {
  const response = await fetch(`${ATLAS_API_BASE}/projects/${projectId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch project: ${response.statusText}`);
  }
  return response.json();
}

export async function fetchVersions(projectId: string): Promise<VersionWithBuilds[]> {
  const response = await fetch(`${ATLAS_API_BASE}/projects/${projectId}/versions`);
  if (!response.ok) {
    throw new Error(`Failed to fetch versions: ${response.statusText}`);
  }
  return response.json();
}

export async function fetchVersion(projectId: string, versionId: string): Promise<VersionWithBuilds> {
  const response = await fetch(`${ATLAS_API_BASE}/projects/${projectId}/versions/${versionId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch version: ${response.statusText}`);
  }
  return response.json();
}

export async function fetchBuilds(
  projectId: string,
  versionId: string,
  channel?: 'ALPHA' | 'BETA' | 'STABLE',
): Promise<Build[]> {
  const url = new URL(`${ATLAS_API_BASE}/projects/${projectId}/versions/${versionId}/builds`);
  if (channel) {
    url.searchParams.set('channel', channel);
  }
  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Failed to fetch builds: ${response.statusText}`);
  }
  return response.json();
}

export async function fetchLatestBuild(projectId: string, versionId: string): Promise<Build> {
  const response = await fetch(`${ATLAS_API_BASE}/projects/${projectId}/versions/${versionId}/builds/latest`);
  if (!response.ok) {
    throw new Error(`Failed to fetch latest build: ${response.statusText}`);
  }
  return response.json();
}

export async function fetchBuild(projectId: string, versionId: string, buildId: number): Promise<Build> {
  const response = await fetch(`${ATLAS_API_BASE}/projects/${projectId}/versions/${versionId}/builds/${buildId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch build: ${response.statusText}`);
  }
  return response.json();
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function getChannelColor(channel: string): string {
  switch (channel?.toUpperCase()) {
    case 'ALPHA':
      return 'channel-alpha';
    case 'BETA':
      return 'channel-beta';
    case 'STABLE':
      return 'channel-stable';
    case 'EXPERIMENTAL':
      return 'channel-experimental';
    default:
      return 'channel-default';
  }
}

export function getAllVersions(versionGroups: Record<string, string[]>): string[] {
  return Object.values(versionGroups).flat();
}

export function getOrderedVersionGroups(versionGroups: Record<string, string[]>): [string, string[]][] {
  return Object.entries(versionGroups).sort((a, b) => {
    const aNum = parseFloat(a[0]);
    const bNum = parseFloat(b[0]);
    return bNum - aNum;
  });
}
