import { database } from '@bx-team/worker/db';
import type { Selectable } from 'kysely';
import type {
  BuildCommitsTable,
  BuildDownloadsTable,
  BuildsTable,
  ProjectsTable,
  Tables,
  VersionsTable,
} from '../tables';

export type ProjectRow = Selectable<ProjectsTable>;
export type VersionRow = Selectable<VersionsTable>;
export type BuildRow = Selectable<BuildsTable>;
export type CommitRow = Omit<Selectable<BuildCommitsTable>, 'build_id' | 'position'> & { owner_id: number };
export type DownloadRow = Omit<Selectable<BuildDownloadsTable>, 'build_id'> & { owner_id: number };
export type TokenRow = { id: number; project: string };

/** D1 refuses more than 100 bound parameters in one statement. */
const IDS_PER_STATEMENT = 90;

export const db = (d1: D1Database) => database<Tables>(d1);

export function projects(d1: D1Database): Promise<ProjectRow[]> {
  return db(d1).selectFrom('projects').selectAll().orderBy('key').execute();
}

export async function project(d1: D1Database, key: string): Promise<ProjectRow | null> {
  return (await db(d1).selectFrom('projects').selectAll().where('key', '=', key).executeTakeFirst()) ?? null;
}

export function versions(d1: D1Database, projectKey: string): Promise<VersionRow[]> {
  return db(d1).selectFrom('versions').selectAll().where('project', '=', projectKey).execute();
}

export async function version(d1: D1Database, projectKey: string, key: string): Promise<VersionRow | null> {
  return (
    (await db(d1)
      .selectFrom('versions')
      .selectAll()
      .where('project', '=', projectKey)
      .where('key', '=', key)
      .executeTakeFirst()) ?? null
  );
}

/** One page of builds, newest first; `after` continues below a build number. */
export function builds(d1: D1Database, versionId: number, limit: number, after?: number): Promise<BuildRow[]> {
  let query = db(d1).selectFrom('builds').selectAll().where('version_id', '=', versionId);
  if (after !== undefined) query = query.where('number', '<', after);
  return query.orderBy('number', 'desc').limit(limit).execute();
}

export async function build(d1: D1Database, versionId: number, number: number): Promise<BuildRow | null> {
  return (
    (await db(d1)
      .selectFrom('builds')
      .selectAll()
      .where('version_id', '=', versionId)
      .where('number', '=', number)
      .executeTakeFirst()) ?? null
  );
}

export async function latestBuild(d1: D1Database, versionId: number): Promise<BuildRow | null> {
  return (
    (await db(d1)
      .selectFrom('builds')
      .selectAll()
      .where('version_id', '=', versionId)
      .orderBy('number', 'desc')
      .limit(1)
      .executeTakeFirst()) ?? null
  );
}

export async function buildCount(d1: D1Database, versionId: number): Promise<number> {
  const row = await db(d1)
    .selectFrom('builds')
    .select(eb => eb.fn.countAll<number>().as('count'))
    .where('version_id', '=', versionId)
    .executeTakeFirst();
  return row?.count ?? 0;
}

/** The newest build, which is what a project's `updated_at` reports. */
export async function lastPublished(d1: D1Database, projectKey: string): Promise<string | null> {
  const row = await db(d1)
    .selectFrom('builds as b')
    .innerJoin('versions as v', 'v.id', 'b.version_id')
    .select(eb => eb.fn.max('b.created_at').as('at'))
    .where('v.project', '=', projectKey)
    .executeTakeFirst();
  return row?.at ?? null;
}

export async function commitsOf(d1: D1Database, ids: number[]): Promise<Map<number, CommitRow[]>> {
  return groupByOwner(
    await inChunks(ids, chunk =>
      db(d1)
        .selectFrom('build_commits')
        .select(['build_id as owner_id', 'sha', 'summary', 'at'])
        .where('build_id', 'in', chunk)
        .orderBy('build_id')
        .orderBy('position')
        .execute(),
    ),
  );
}

export async function downloadsOf(d1: D1Database, ids: number[]): Promise<Map<number, DownloadRow[]>> {
  return groupByOwner(
    await inChunks(ids, chunk =>
      db(d1)
        .selectFrom('build_downloads')
        .select(['build_id as owner_id', 'name', 'file_name', 'file_path', 'size', 'sha256'])
        .where('build_id', 'in', chunk)
        .orderBy('build_id')
        .orderBy('name')
        .execute(),
    ),
  );
}

export async function findToken(d1: D1Database, tokenHash: string): Promise<TokenRow | null> {
  return (
    (await db(d1)
      .selectFrom('tokens')
      .select(['id', 'project'])
      .where('token_hash', '=', tokenHash)
      .executeTakeFirst()) ?? null
  );
}

export function touchToken(d1: D1Database, id: number): Promise<unknown> {
  return db(d1)
    .updateTable('tokens')
    .set(eb => ({ last_used: eb.fn<string>('datetime', [eb.val('now')]) }))
    .where('id', '=', id)
    .execute();
}

async function inChunks<T>(ids: number[], query: (chunk: number[]) => Promise<T[]>): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; offset < ids.length; offset += IDS_PER_STATEMENT)
    rows.push(...(await query(ids.slice(offset, offset + IDS_PER_STATEMENT))));
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
export function allVersionKeys(d1: D1Database): Promise<{ project: string; key: string }[]> {
  return db(d1).selectFrom('versions').select(['project', 'key']).execute();
}

export async function allLastPublished(d1: D1Database): Promise<{ project: string; at: string }[]> {
  const rows = await db(d1)
    .selectFrom('builds as b')
    .innerJoin('versions as v', 'v.id', 'b.version_id')
    .select(eb => ['v.project as project', eb.fn.max('b.created_at').as('at')])
    .groupBy('v.project')
    .execute();
  return rows.flatMap(row => (row.at ? [{ project: row.project, at: row.at }] : []));
}
