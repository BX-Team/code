import { CreateVersionBodySchema } from '@bx-team/types/schema/atlas';
import { Hono } from 'hono';
import { atlasDb, createVersion, findVersion, listBuilds, listVersions } from '../../database/models/atlas';
import { versionResponse } from '../../models/atlas';
import { badRequest, conflict, internal } from '../../util/error';
import { requireApiSecret } from '../../util/secret';
import { type AtlasEnv, requireProject, requireVersion } from './context';

export const versions = new Hono<AtlasEnv>();

versions.get('/projects/:project/versions', async c => {
  const db = atlasDb(c.env.ATLAS_DB);
  const project = await requireProject(db, c.req.param('project'));

  const projectVersions = await listVersions(db, [project.id]);
  const versionBuilds = await listBuilds(
    db,
    projectVersions.map(version => version.id),
  );

  const buildNumbersByVersion = new Map<number, number[]>();
  for (const build of versionBuilds) {
    buildNumbersByVersion.set(build.versionId, [
      ...(buildNumbersByVersion.get(build.versionId) ?? []),
      build.buildNumber,
    ]);
  }

  return c.json(projectVersions.map(version => versionResponse(version, buildNumbersByVersion.get(version.id) ?? [])));
});

versions.post('/projects/:project/versions/create', requireApiSecret, async c => {
  const db = atlasDb(c.env.ATLAS_DB);
  const projectKey = c.req.param('project');

  const parsed = CreateVersionBodySchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) throw badRequest(parsed.error.message);
  const body = parsed.data;

  const project = await requireProject(db, projectKey);

  if (await findVersion(db, project.id, body.key)) {
    throw conflict(`Version '${body.key}' already exists for project '${projectKey}'`);
  }

  const version = await createVersion(db, project.id, {
    key: body.key,
    supportStatus: body.supportStatus ?? 'SUPPORTED',
    javaMinVersion: body.javaMinVersion ?? null,
  });
  if (!version) throw internal('Failed to create version');

  return c.json(
    {
      message: 'Version created successfully',
      version: {
        id: version.id,
        project: projectKey,
        key: version.key,
        supportStatus: version.supportStatus,
        javaMinVersion: version.javaMinVersion,
      },
    },
    201,
  );
});

versions.get('/projects/:project/versions/:version', async c => {
  const db = atlasDb(c.env.ATLAS_DB);
  const projectKey = c.req.param('project');

  const project = await requireProject(db, projectKey);
  const version = await requireVersion(db, project.id, projectKey, c.req.param('version'));
  const versionBuilds = await listBuilds(db, [version.id]);

  return c.json(
    versionResponse(
      version,
      versionBuilds.map(build => build.buildNumber),
    ),
  );
});
