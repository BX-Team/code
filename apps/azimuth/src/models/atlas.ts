import type { BuildRow, CommitRow, DownloadRow, ProjectRow, VersionRow } from '../database/models/atlas';
import { groupVersions } from '../util/versions';

/** API contract for the Atlas group — what the downloads clients actually see. */

export function projectResponse(project: ProjectRow, versionKeys: string[]) {
  return {
    project: {
      id: project.key,
      name: project.name,
      ...(project.description && { description: project.description }),
      ...(project.latestVersion && { latestVersion: project.latestVersion }),
      ...(project.experimentalVersion && { experimentalVersion: project.experimentalVersion }),
    },
    version_groups: groupVersions(versionKeys),
  };
}

export function versionResponse(version: VersionRow, buildNumbers: number[]) {
  return {
    version: {
      id: version.key,
      ...(version.javaMinVersion && { java: { version: { minimum: version.javaMinVersion } } }),
      support: { status: version.supportStatus },
    },
    builds: buildNumbers.sort((a, b) => b - a),
  };
}

export function buildResponse(
  build: BuildRow,
  buildCommits: CommitRow[],
  buildDownloads: DownloadRow[],
  publicUrl: string,
) {
  const downloadsMap: Record<string, { name: string; checksums: { sha256: string }; size: number; url: string }> = {};
  for (const dl of buildDownloads) {
    downloadsMap[dl.name] = {
      name: dl.fileName,
      checksums: { sha256: dl.sha256 },
      size: dl.size,
      url: `${publicUrl}/${dl.filePath}`,
    };
  }

  return {
    id: build.buildNumber,
    time: build.time.toISOString(),
    channel: build.channel,
    commits: buildCommits.map(commit => ({
      sha: commit.sha,
      message: commit.message,
      time: commit.time.toISOString(),
    })),
    downloads: downloadsMap,
  };
}
