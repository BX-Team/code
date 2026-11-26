import type { Channel, ProjectPatch, PublishCommit, VersionPatch } from '@bx-team/types/schema/downloads';
import { batch } from '@bx-team/worker/db';
import { type BuildRow, db, type VersionRow, version } from './downloads';

/** D1 refuses more than 100 bound parameters in one statement; a commit binds five. */
const COMMITS_PER_STATEMENT = 20;

export interface NewDownload {
  name: string;
  fileName: string;
  filePath: string;
  size: number;
  sha256: string;
}

/** Publishing into a version that does not exist creates it with the server defaults. */
export async function ensureVersion(d1: D1Database, projectKey: string, key: string): Promise<VersionRow | null> {
  await db(d1)
    .insertInto('versions')
    .values({ project: projectKey, key })
    .onConflict(oc => oc.columns(['project', 'key']).doNothing())
    .execute();
  return version(d1, projectKey, key);
}

export async function nextBuildNumber(d1: D1Database, versionId: number): Promise<number> {
  const row = await db(d1)
    .selectFrom('builds')
    .select(eb => eb(eb.fn.coalesce(eb.fn.max('number'), eb.lit(0)), '+', 1).as('next'))
    .where('version_id', '=', versionId)
    .executeTakeFirst();
  return row?.next ?? 1;
}

/** Upserts: a rerun of a failed upload republishes the same number, and several artifacts come one request each. */
export async function upsertBuild(
  d1: D1Database,
  versionId: number,
  number: number,
  channel: Channel,
  commitSha: string | null,
): Promise<BuildRow | null> {
  return (
    (await db(d1)
      .insertInto('builds')
      .values({ version_id: versionId, number, channel, commit_sha: commitSha, created_at: now() })
      .onConflict(oc =>
        oc.columns(['version_id', 'number']).doUpdateSet(eb => ({
          channel: eb.ref('excluded.channel'),
          commit_sha: eb.fn.coalesce(eb.ref('excluded.commit_sha'), eb.ref('builds.commit_sha')),
        })),
      )
      .returningAll()
      .executeTakeFirst()) ?? null
  );
}

// Not the column default: SQLite's `datetime('now')` has no zone, so a browser reads it as local time.
function now(): string {
  return new Date().toISOString();
}

/** One batch, since D1 has no interactive transactions; the caller removes the bucket object if this throws. */
export function attach(d1: D1Database, id: number, commits: PublishCommit[], download: NewDownload): Promise<void> {
  const q = db(d1);
  const statements = [];
  if (commits.length) {
    statements.push(q.deleteFrom('build_commits').where('build_id', '=', id));
    for (let offset = 0; offset < commits.length; offset += COMMITS_PER_STATEMENT) {
      const chunk = commits.slice(offset, offset + COMMITS_PER_STATEMENT);
      statements.push(
        q
          .insertInto('build_commits')
          .values(chunk.map((commit, index) => ({ build_id: id, position: offset + index, ...commit }))),
      );
    }
  }
  statements.push(
    q
      .insertInto('build_downloads')
      .values({
        build_id: id,
        name: download.name,
        file_name: download.fileName,
        file_path: download.filePath,
        size: download.size,
        sha256: download.sha256,
      })
      .onConflict(oc =>
        oc.columns(['build_id', 'name']).doUpdateSet(eb => ({
          file_name: eb.ref('excluded.file_name'),
          file_path: eb.ref('excluded.file_path'),
          size: eb.ref('excluded.size'),
          sha256: eb.ref('excluded.sha256'),
        })),
      ),
  );
  return batch(d1, statements);
}

export function deleteBuild(d1: D1Database, id: number): Promise<unknown> {
  return db(d1).deleteFrom('builds').where('id', '=', id).execute();
}

/** Only the fields the body actually carried are written; `undefined` means untouched. */
export async function patchVersion(d1: D1Database, id: number, patch: VersionPatch): Promise<void> {
  const set = defined({ support: patch.support, java_min: patch.java_min });
  if (Object.keys(set).length) await db(d1).updateTable('versions').set(set).where('id', '=', id).execute();
}

export async function patchProject(d1: D1Database, key: string, patch: ProjectPatch): Promise<void> {
  const set = defined({
    name: patch.name,
    description: patch.description,
    repo: patch.repo,
    latest_version: patch.latest,
    experimental_version: patch.experimental,
  });
  if (Object.keys(set).length) await db(d1).updateTable('projects').set(set).where('key', '=', key).execute();
}

function defined<T extends object>(fields: T): { [K in keyof T]: Exclude<T[K], undefined> } {
  return Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined)) as never;
}
