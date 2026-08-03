import { Hono } from 'hono';
import { atlasDb, listProjects, listVersions } from '../../database/models/atlas';
import { projectResponse } from '../../models/atlas';
import { type AtlasEnv, requireProject } from './context';

export const projects = new Hono<AtlasEnv>();

projects.get('/projects', async c => {
  const db = atlasDb(c.env.ATLAS_DB);

  const allProjects = await listProjects(db);
  const allVersions = await listVersions(
    db,
    allProjects.map(project => project.id),
  );

  const versionKeysByProject = new Map<number, string[]>();
  for (const version of allVersions) {
    versionKeysByProject.set(version.projectId, [...(versionKeysByProject.get(version.projectId) ?? []), version.key]);
  }

  return c.json({
    projects: allProjects.map(project => projectResponse(project, versionKeysByProject.get(project.id) ?? [])),
  });
});

projects.get('/projects/:project', async c => {
  const db = atlasDb(c.env.ATLAS_DB);
  const project = await requireProject(db, c.req.param('project'));
  const projectVersions = await listVersions(db, [project.id]);

  return c.json(
    projectResponse(
      project,
      projectVersions.map(version => version.key),
    ),
  );
});
