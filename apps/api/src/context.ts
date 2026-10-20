import type { ProjectKind } from '@bx-team/types/schema/downloads';
import type { D1Database } from '@cloudflare/workers-types';
import { type ProjectRow, project, type VersionRow, version } from './database/downloads';
import type { Env } from './env';
import { notFound } from './util/error';

export type AppEnv = { Bindings: Env; Variables: { project: ProjectRow } };

export async function requireProject(db: D1Database, key: string): Promise<ProjectRow> {
  const row = await project(db, key);
  if (!row) throw notFound(`Project '${key}' not found`);
  return row;
}

export async function requireVersion(db: D1Database, projectKey: string, key: string): Promise<VersionRow> {
  const row = await version(db, projectKey, key);
  if (!row) throw notFound(`Version '${key}' not found for project '${projectKey}'`);
  return row;
}

/** A project answers under its own tree and 404s under the other: absent, never forbidden. */
export function requireKind(row: ProjectRow, kind: ProjectKind): ProjectRow {
  if (row.kind !== kind) throw notFound(`Project '${row.key}' not found`);
  return row;
}
