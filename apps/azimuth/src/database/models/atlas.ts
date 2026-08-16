import { type AtlasDb, atlasProjects, builds, commits, createAtlasDb, downloads, versions } from '@bx-team/stratus/d1';
import type { D1Database } from '@cloudflare/workers-types';
import { and, desc, eq, inArray } from 'drizzle-orm';

export type ProjectRow = typeof atlasProjects.$inferSelect;
export type VersionRow = typeof versions.$inferSelect;
export type BuildRow = typeof builds.$inferSelect;
export type CommitRow = typeof commits.$inferSelect;
export type DownloadRow = typeof downloads.$inferSelect;

export type Channel = BuildRow['channel'];
export type SupportStatus = VersionRow['supportStatus'];

export interface NewVersion {
  key: string;
  supportStatus: SupportStatus;
  javaMinVersion: number | null;
}

export interface NewCommit {
  sha: string;
  message: string;
  time: string;
}

export interface NewDownload {
  name: string;
  fileName: string;
  filePath: string;
  size: number;
  sha256: string;
}

export function atlasDb(binding: D1Database): AtlasDb {
  return createAtlasDb(binding);
}

export function listProjects(db: AtlasDb) {
  return db.select().from(atlasProjects);
}

export async function findProject(db: AtlasDb, projectKey: string) {
  const [project] = await db.select().from(atlasProjects).where(eq(atlasProjects.key, projectKey)).limit(1);
  return project;
}

export function listVersions(db: AtlasDb, projectIds: number[]) {
  if (!projectIds.length) return Promise.resolve([] as VersionRow[]);
  return db.select().from(versions).where(inArray(versions.projectId, projectIds));
}

export async function findVersion(db: AtlasDb, projectId: number, versionKey: string) {
  const [version] = await db
    .select()
    .from(versions)
    .where(and(eq(versions.projectId, projectId), eq(versions.key, versionKey)))
    .limit(1);
  return version;
}

export async function createVersion(db: AtlasDb, projectId: number, version: NewVersion) {
  const [created] = await db
    .insert(versions)
    .values({ projectId, ...version })
    .returning();
  return created;
}

export function listBuilds(db: AtlasDb, versionIds: number[], channel?: Channel) {
  if (!versionIds.length) return Promise.resolve([] as BuildRow[]);
  const conditions = [inArray(builds.versionId, versionIds)];
  if (channel) conditions.push(eq(builds.channel, channel));
  return db
    .select()
    .from(builds)
    .where(and(...conditions))
    .orderBy(desc(builds.buildNumber));
}

export async function findBuild(db: AtlasDb, versionId: number, buildNumber: number) {
  const [build] = await db
    .select()
    .from(builds)
    .where(and(eq(builds.versionId, versionId), eq(builds.buildNumber, buildNumber)))
    .limit(1);
  return build;
}

export async function findLatestBuild(db: AtlasDb, versionId: number) {
  const [build] = await db
    .select()
    .from(builds)
    .where(eq(builds.versionId, versionId))
    .orderBy(desc(builds.buildNumber))
    .limit(1);
  return build;
}

/** Batched (non-N+1) commit/download lookups for a set of builds. */
export async function buildDetails(db: AtlasDb, buildIds: number[]) {
  const [allCommits, allDownloads] = buildIds.length
    ? await Promise.all([
        db.select().from(commits).where(inArray(commits.buildId, buildIds)),
        db.select().from(downloads).where(inArray(downloads.buildId, buildIds)),
      ])
    : [[] as CommitRow[], [] as DownloadRow[]];

  const commitsByBuild = new Map<number, CommitRow[]>();
  for (const commit of allCommits) {
    commitsByBuild.set(commit.buildId, [...(commitsByBuild.get(commit.buildId) ?? []), commit]);
  }
  const downloadsByBuild = new Map<number, DownloadRow[]>();
  for (const download of allDownloads) {
    downloadsByBuild.set(download.buildId, [...(downloadsByBuild.get(download.buildId) ?? []), download]);
  }

  return { commitsByBuild, downloadsByBuild };
}

export async function createBuild(db: AtlasDb, versionId: number, buildNumber: number, channel: Channel) {
  const [created] = await db.insert(builds).values({ versionId, buildNumber, channel, time: new Date() }).returning();
  return created;
}

/**
 * Attaches the artifact and commit rows to a freshly created build. D1 has no interactive
 * transactions, so `db.batch()` is the atomic unit and the build row is compensated away
 * by the caller if this throws.
 */
export async function attachBuildArtifacts(
  db: AtlasDb,
  buildId: number,
  download: NewDownload,
  buildCommits: NewCommit[],
) {
  const downloadInsert = db.insert(downloads).values({ buildId, ...download });

  if (!buildCommits.length) {
    await downloadInsert;
    return;
  }

  await db.batch([
    db.insert(commits).values(
      buildCommits.map(commit => ({
        buildId,
        sha: commit.sha,
        message: commit.message,
        time: new Date(commit.time),
      })),
    ),
    downloadInsert,
  ]);
}

export function deleteBuild(db: AtlasDb, buildId: number) {
  return db.delete(builds).where(eq(builds.id, buildId));
}
