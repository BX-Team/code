import type {
  Build,
  Commit,
  Download,
  Project,
  ProjectSummary,
  Release,
  VersionSummary,
} from '@bx-team/types/schema/downloads';
import type { BuildRow, CommitRow, DownloadRow, ProjectRow, ReleaseRow, VersionRow } from '../database/downloads';
import { groupVersions, sortNewestFirst } from '../util/versions';

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

function commitResponse(row: CommitRow): Commit {
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
