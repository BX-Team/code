import type { Channel, ProjectKind, Support } from '@bx-team/types/schema/downloads';
import type { BuildRow, CommitRow, DownloadRow, ProjectRow, ReleaseRow, VersionRow } from '../database/downloads';
import { groupVersions, sortNewestFirst } from '../util/versions';

/** `url` points at the bucket, never at this Worker. */
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

export interface Page<T> {
  items: T[];
  next: string | null;
}

/**
 * A versioned project without an explicit `latest_version` falls back to its newest
 * version, and a release project to its newest tag — the page has to open on something.
 */
export function projectSummary(
  row: ProjectRow,
  keys: string[],
  updatedAt: string | null,
  newestTag: string | null,
): ProjectSummary {
  const latest = row.kind === 'versioned' ? (row.latest_version ?? sortNewestFirst(keys)[0] ?? null) : newestTag;

  return {
    key: row.key,
    name: row.name,
    kind: row.kind,
    description: row.description,
    repo: row.repo,
    latest,
    experimental: row.experimental_version,
    updated_at: updatedAt,
  };
}

export function projectDetail(summary: ProjectSummary, versionKeys: string[], releaseTags: string[]): Project {
  if (summary.kind === 'release') return { ...summary, releases: releaseTags };

  const sorted = sortNewestFirst(versionKeys);
  return { ...summary, versions: sorted, version_groups: groupVersions(sorted) };
}

export function versionSummary(row: VersionRow, latestBuild: number | null, buildCount: number): VersionSummary {
  return {
    version: row.key,
    support: row.support,
    java_min: row.java_min,
    latest_build: latestBuild,
    build_count: buildCount,
  };
}

export function buildResponse(
  row: BuildRow,
  projectKey: string,
  versionKey: string,
  commits: CommitRow[],
  downloads: DownloadRow[],
  publicUrl: string,
): Build {
  return {
    build: row.number,
    project: projectKey,
    version: versionKey,
    channel: row.channel,
    created_at: row.created_at,
    commit: row.commit_sha,
    commits: commits.map(commitResponse),
    downloads: downloadsResponse(downloads, publicUrl),
  };
}

export function releaseResponse(
  row: ReleaseRow,
  commits: CommitRow[],
  downloads: DownloadRow[],
  publicUrl: string,
): Release {
  return {
    tag: row.tag,
    project: row.project,
    channel: row.channel,
    created_at: row.created_at,
    commit: row.commit_sha,
    notes: row.notes,
    commits: commits.map(commitResponse),
    downloads: downloadsResponse(downloads, publicUrl),
  };
}

function commitResponse(row: CommitRow): BuildCommit {
  return { sha: row.sha, summary: row.summary, at: row.at };
}

function downloadsResponse(rows: DownloadRow[], publicUrl: string): Record<string, Download> {
  const downloads: Record<string, Download> = {};
  for (const row of rows) {
    downloads[row.name] = {
      name: row.file_name,
      size: row.size,
      sha256: row.sha256,
      url: `${publicUrl}/${row.file_path}`,
    };
  }
  return downloads;
}
