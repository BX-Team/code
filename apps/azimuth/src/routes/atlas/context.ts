import type { AtlasDb } from '@bx-team/stratus/d1';
import { findProject, findVersion } from '../../database/models/atlas';
import type { Env } from '../../env';
import { notFound } from '../../util/error';

export type AtlasEnv = { Bindings: Env };

export async function requireProject(db: AtlasDb, projectKey: string) {
  const project = await findProject(db, projectKey);
  if (!project) throw notFound(`Project '${projectKey}' not found`);
  return project;
}

export async function requireVersion(db: AtlasDb, projectId: number, projectKey: string, versionKey: string) {
  const version = await findVersion(db, projectId, versionKey);
  if (!version) throw notFound(`Version '${versionKey}' not found for project '${projectKey}'`);
  return version;
}
