import type { Channel, ProjectPatch, PublishCommit, VersionPatch } from '@bx-team/types/schema/downloads';
import type { D1Database, D1PreparedStatement } from '@cloudflare/workers-types';
import { type BuildRow, type VersionRow, version } from './downloads';

/** D1 refuses more than 100 bound parameters in one statement; a commit binds four. */
const COMMITS_PER_STATEMENT = 20;

export interface NewDownload {
  name: string;
  fileName: string;
  filePath: string;
  size: number;
  sha256: string;
}

/** Publishing into a version that does not exist creates it with the server defaults. */
export async function ensureVersion(db: D1Database, projectKey: string, key: string): Promise<VersionRow | null> {
  await db
    .prepare('insert into versions (project, key) values (?, ?) on conflict (project, key) do nothing')
    .bind(projectKey, key)
    .run();

  return version(db, projectKey, key);
}

export function nextBuildNumber(db: D1Database, versionId: number): Promise<number> {
  return db
    .prepare('select coalesce(max(number), 0) + 1 as next from builds where version_id = ?')
    .bind(versionId)
    .first<{ next: number }>()
    .then(row => row?.next ?? 1);
}

/**
 * Upserts rather than conflicts: a re-run of a failed upload step republishes the same
 * number, and a project with several artifacts publishes them one request at a time.
 */
export function upsertBuild(
  db: D1Database,
  versionId: number,
  number: number,
  channel: Channel,
  commitSha: string | null,
): Promise<BuildRow | null> {
  return db
    .prepare(
      `insert into builds (version_id, number, channel, commit_sha, created_at) values (?, ?, ?, ?, ?)
       on conflict (version_id, number) do update
         set channel = excluded.channel, commit_sha = coalesce(excluded.commit_sha, builds.commit_sha)
       returning *`,
    )
    .bind(versionId, number, channel, commitSha, now())
    .first<BuildRow>();
}

/**
 * A published timestamp is written from here, not left to the column default: SQLite's
 * `datetime('now')` has no zone, and `new Date('2026-09-05 23:07:31')` is read as local
 * time by a browser. It also has to sort against the ISO strings the older rows carry.
 */
function now(): string {
  return new Date().toISOString();
}

/**
 * Writes the commit list and the artifact of one build. D1 has no interactive
 * transactions, so `db.batch()` is the atomic unit and the caller compensates the object
 * it already put in the bucket if this throws.
 */
export function attach(db: D1Database, id: number, commits: PublishCommit[], download: NewDownload): Promise<unknown> {
  const statements: D1PreparedStatement[] = [];

  if (commits.length) {
    statements.push(db.prepare('delete from build_commits where build_id = ?').bind(id));

    for (let offset = 0; offset < commits.length; offset += COMMITS_PER_STATEMENT) {
      const chunk = commits.slice(offset, offset + COMMITS_PER_STATEMENT);
      statements.push(
        db
          .prepare(
            `insert into build_commits (build_id, position, sha, summary, at)
             values ${chunk.map(() => '(?, ?, ?, ?, ?)').join(', ')}`,
          )
          .bind(...chunk.flatMap((commit, index) => [id, offset + index, commit.sha, commit.summary, commit.at])),
      );
    }
  }

  statements.push(
    db
      .prepare(
        `insert into build_downloads (build_id, name, file_name, file_path, size, sha256)
         values (?, ?, ?, ?, ?, ?)
         on conflict (build_id, name) do update
           set file_name = excluded.file_name, file_path = excluded.file_path,
               size = excluded.size, sha256 = excluded.sha256`,
      )
      .bind(id, download.name, download.fileName, download.filePath, download.size, download.sha256),
  );

  return db.batch(statements);
}

export function deleteBuild(db: D1Database, id: number): Promise<unknown> {
  return db.prepare('delete from builds where id = ?').bind(id).run();
}

export function patchVersion(db: D1Database, id: number, patch: VersionPatch): Promise<unknown> {
  return update(db, 'versions', 'id', id, {
    support: patch.support,
    java_min: patch.java_min,
  });
}

export function patchProject(db: D1Database, key: string, patch: ProjectPatch): Promise<unknown> {
  return update(db, 'projects', 'key', key, {
    name: patch.name,
    description: patch.description,
    repo: patch.repo,
    latest_version: patch.latest,
    experimental_version: patch.experimental,
  });
}

/** Only the fields the body actually carried are written; `undefined` means untouched. */
function update(
  db: D1Database,
  table: string,
  keyColumn: string,
  key: string | number,
  fields: Record<string, string | number | null | undefined>,
): Promise<unknown> {
  const entries = Object.entries(fields).filter(([, value]) => value !== undefined);
  if (!entries.length) return Promise.resolve(null);

  return db
    .prepare(`update ${table} set ${entries.map(([column]) => `${column} = ?`).join(', ')} where ${keyColumn} = ?`)
    .bind(...entries.map(([, value]) => value ?? null), key)
    .run();
}
