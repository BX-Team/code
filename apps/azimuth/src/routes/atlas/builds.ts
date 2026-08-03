import { BuildsQuerySchema } from '@bx-team/types/schema/atlas';
import { Hono } from 'hono';
import { atlasDb, buildDetails, findBuild, findLatestBuild, listBuilds } from '../../database/models/atlas';
import { buildResponse } from '../../models/atlas';
import { badRequest, notFound } from '../../util/error';
import { type AtlasEnv, requireProject, requireVersion } from './context';

export const builds = new Hono<AtlasEnv>();

builds.get('/projects/:project/versions/:version/builds', async c => {
  const db = atlasDb(c.env.ATLAS_DB);
  const projectKey = c.req.param('project');

  const parsedQuery = BuildsQuerySchema.safeParse(c.req.query());
  if (!parsedQuery.success) throw badRequest(parsedQuery.error.message);

  const project = await requireProject(db, projectKey);
  const version = await requireVersion(db, project.id, projectKey, c.req.param('version'));

  const versionBuilds = await listBuilds(db, [version.id], parsedQuery.data.channel);
  const { commitsByBuild, downloadsByBuild } = await buildDetails(
    db,
    versionBuilds.map(build => build.id),
  );

  return c.json(
    versionBuilds.map(build =>
      buildResponse(
        build,
        commitsByBuild.get(build.id) ?? [],
        downloadsByBuild.get(build.id) ?? [],
        c.env.R2_PUBLIC_URL,
      ),
    ),
  );
});

builds.get('/projects/:project/versions/:version/builds/latest', async c => {
  const db = atlasDb(c.env.ATLAS_DB);
  const projectKey = c.req.param('project');
  const versionKey = c.req.param('version');

  const project = await requireProject(db, projectKey);
  const version = await requireVersion(db, project.id, projectKey, versionKey);

  const build = await findLatestBuild(db, version.id);
  if (!build) throw notFound(`No builds found for version '${versionKey}' of project '${projectKey}'`);

  const { commitsByBuild, downloadsByBuild } = await buildDetails(db, [build.id]);

  return c.json(
    buildResponse(build, commitsByBuild.get(build.id) ?? [], downloadsByBuild.get(build.id) ?? [], c.env.R2_PUBLIC_URL),
  );
});

builds.get('/projects/:project/versions/:version/builds/:build', async c => {
  const db = atlasDb(c.env.ATLAS_DB);
  const projectKey = c.req.param('project');
  const versionKey = c.req.param('version');
  const buildParam = c.req.param('build');

  if (!/^\d+$/.test(buildParam)) throw badRequest('Build number must be a positive integer');
  const buildNumber = parseInt(buildParam, 10);

  const project = await requireProject(db, projectKey);
  const version = await requireVersion(db, project.id, projectKey, versionKey);

  const build = await findBuild(db, version.id, buildNumber);
  if (!build) {
    throw notFound(`Build '${buildNumber}' not found for version '${versionKey}' of project '${projectKey}'`);
  }

  const { commitsByBuild, downloadsByBuild } = await buildDetails(db, [build.id]);

  return c.json(
    buildResponse(build, commitsByBuild.get(build.id) ?? [], downloadsByBuild.get(build.id) ?? [], c.env.R2_PUBLIC_URL),
  );
});
