import type { Channel, ProjectKind, Support } from '@bx-team/types/schema/downloads';
import type { D1Database } from '@cloudflare/workers-types';

export interface ProjectRow {
  key: string;
  name: string;
  kind: ProjectKind;
  description: string | null;
  repo: string | null;
  latest_version: string | null;
  experimental_version: string | null;
  created_at: string;
}

export interface VersionRow {
  id: number;
  project: string;
  key: string;
  support: Support;
  java_min: number | null;
  created_at: string;
}

export interface BuildRow {
  id: number;
  version_id: number;
  number: number;
  channel: Channel;
  commit_sha: string | null;
  created_at: string;
}

export interface ReleaseRow {
  id: number;
  project: string;
  tag: string;
  channel: Channel;
  commit_sha: string | null;
  notes: string | null;
  created_at: string;
}

export interface CommitRow {
  owner_id: number;
  sha: string;
  summary: string;
  at: string;
}

export interface DownloadRow {
  owner_id: number;
  name: string;
  file_name: string;
  file_path: string;
  size: number;
  sha256: string;
}

export interface TokenRow {
  id: number;
  project: string;
}

/** Which pair of child tables a build or a release owns. */
export type Owner = 'build' | 'release';

export const CHILD_TABLES: Record<Owner, { commits: string; downloads: string; column: string }> = {
  build: { commits: 'build_commits', downloads: 'build_downloads', column: 'build_id' },
  release: { commits: 'release_commits', downloads: 'release_downloads', column: 'release_id' },
};

/** D1 refuses more than 100 bound parameters in one statement. */
const IDS_PER_STATEMENT = 90;

function all<T>(db: D1Database, sql: string, ...binds: unknown[]): Promise<T[]> {
  return db
    .prepare(sql)
    .bind(...binds)
    .all<T>()
    .then(result => result.results);
}

function first<T>(db: D1Database, sql: string, ...binds: unknown[]): Promise<T | null> {
  return db
    .prepare(sql)
    .bind(...binds)
    .first<T>();
}

const placeholders = (count: number) => Array.from({ length: count }, () => '?').join(', ');

export function projects(db: D1Database): Promise<ProjectRow[]> {
  return all<ProjectRow>(db, 'select * from projects order by key');
}

export function project(db: D1Database, key: string): Promise<ProjectRow | null> {
  return first<ProjectRow>(db, 'select * from projects where key = ?', key);
}

export function versions(db: D1Database, projectKey: string): Promise<VersionRow[]> {
  return all<VersionRow>(db, 'select * from versions where project = ?', projectKey);
}

export function version(db: D1Database, projectKey: string, key: string): Promise<VersionRow | null> {
  return first<VersionRow>(db, 'select * from versions where project = ? and key = ?', projectKey, key);
}

/** One page of builds, newest first; `after` continues below a build number. */
export function builds(db: D1Database, versionId: number, limit: number, after?: number): Promise<BuildRow[]> {
  return after === undefined
    ? all<BuildRow>(db, 'select * from builds where version_id = ? order by number desc limit ?', versionId, limit)
    : all<BuildRow>(
        db,
        'select * from builds where version_id = ? and number < ? order by number desc limit ?',
        versionId,
        after,
        limit,
      );
}

export function build(db: D1Database, versionId: number, number: number): Promise<BuildRow | null> {
  return first<BuildRow>(db, 'select * from builds where version_id = ? and number = ?', versionId, number);
}

export function latestBuild(db: D1Database, versionId: number): Promise<BuildRow | null> {
  return first<BuildRow>(db, 'select * from builds where version_id = ? order by number desc limit 1', versionId);
}

export function buildCount(db: D1Database, versionId: number): Promise<number> {
  return first<{ count: number }>(db, 'select count(*) as count from builds where version_id = ?', versionId).then(
    row => row?.count ?? 0,
  );
}

/** Newest first: releases are ordered by insertion, because a tag has no ordering. */
export function releases(db: D1Database, projectKey: string): Promise<ReleaseRow[]> {
  return all<ReleaseRow>(db, 'select * from releases where project = ? order by id desc', projectKey);
}

export function release(db: D1Database, projectKey: string, tag: string): Promise<ReleaseRow | null> {
  return first<ReleaseRow>(db, 'select * from releases where project = ? and tag = ?', projectKey, tag);
}

export function latestRelease(db: D1Database, projectKey: string): Promise<ReleaseRow | null> {
  return first<ReleaseRow>(db, 'select * from releases where project = ? order by id desc limit 1', projectKey);
}

/** The newest publish of either shape, which is what a project's `updated_at` reports. */
export async function lastPublished(db: D1Database, projectKey: string): Promise<string | null> {
  const row = await first<{ at: string | null }>(
    db,
    `select max(at) as at from (
       select max(b.created_at) as at from builds b
         join versions v on v.id = b.version_id where v.project = ?
       union all
       select max(created_at) as at from releases where project = ?
     )`,
    projectKey,
    projectKey,
  );
  return row?.at ?? null;
}

export async function commitsOf(db: D1Database, owner: Owner, ids: number[]): Promise<Map<number, CommitRow[]>> {
  const table = CHILD_TABLES[owner];

  return groupByOwner(
    await inChunks<CommitRow>(
      db,
      ids,
      chunk => `select ${table.column} as owner_id, sha, summary, at from ${table.commits}
         where ${table.column} in (${placeholders(chunk)}) order by ${table.column}, position`,
    ),
  );
}

export async function downloadsOf(db: D1Database, owner: Owner, ids: number[]): Promise<Map<number, DownloadRow[]>> {
  const table = CHILD_TABLES[owner];

  return groupByOwner(
    await inChunks<DownloadRow>(
      db,
      ids,
      chunk => `select ${table.column} as owner_id, name, file_name, file_path, size, sha256 from ${table.downloads}
         where ${table.column} in (${placeholders(chunk)}) order by ${table.column}, name`,
    ),
  );
}

export function findToken(db: D1Database, tokenHash: string): Promise<TokenRow | null> {
  return first<TokenRow>(db, 'select id, project from tokens where token_hash = ?', tokenHash);
}

export function touchToken(db: D1Database, id: number): Promise<unknown> {
  return db.prepare("update tokens set last_used = datetime('now') where id = ?").bind(id).run();
}

/** One page of builds can carry more ids than a single statement may bind. */
async function inChunks<T>(db: D1Database, ids: number[], sql: (chunk: number) => string): Promise<T[]> {
  const rows: T[] = [];

  for (let offset = 0; offset < ids.length; offset += IDS_PER_STATEMENT) {
    const chunk = ids.slice(offset, offset + IDS_PER_STATEMENT);
    rows.push(...(await all<T>(db, sql(chunk.length), ...chunk)));
  }

  return rows;
}

function groupByOwner<T extends { owner_id: number }>(rows: T[]): Map<number, T[]> {
  const grouped = new Map<number, T[]>();
  for (const row of rows) {
    const existing = grouped.get(row.owner_id);
    if (existing) existing.push(row);
    else grouped.set(row.owner_id, [row]);
  }
  return grouped;
}

/** The list endpoint needs every project's summary at once, so these avoid an N+1. */
export function allVersionKeys(db: D1Database): Promise<{ project: string; key: string }[]> {
  return all<{ project: string; key: string }>(db, 'select project, key from versions');
}

export function allLastPublished(db: D1Database): Promise<{ project: string; at: string }[]> {
  return all<{ project: string; at: string }>(
    db,
    `select project, max(at) as at from (
       select v.project as project, max(b.created_at) as at from builds b
         join versions v on v.id = b.version_id group by v.project
       union all
       select project, max(created_at) as at from releases group by project
     ) group by project`,
  );
}

export function allNewestTags(db: D1Database): Promise<{ project: string; tag: string }[]> {
  return all<{ project: string; tag: string }>(
    db,
    'select project, tag from releases where id in (select max(id) from releases group by project)',
  );
}
