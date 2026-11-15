import { getProject, listProjects } from '@bx-team/types/api';
import { requireProject } from '../context';
import { allLastPublished, allVersionKeys, lastPublished, projects, versions } from '../database/downloads';
import { projectDetail, projectSummary } from '../models/downloads';
import { router } from '../router';

export const projectRoutes = router()
  .openapi(listProjects, async c => {
    const db = c.env.DB;
    const [rows, versionKeys, published] = await Promise.all([projects(db), allVersionKeys(db), allLastPublished(db)]);

    const keysByProject = new Map<string, string[]>();
    for (const row of versionKeys) {
      keysByProject.set(row.project, [...(keysByProject.get(row.project) ?? []), row.key]);
    }
    const publishedByProject = new Map(published.map(row => [row.project, row.at]));

    return c.json(
      rows.map(row => projectSummary(row, keysByProject.get(row.key) ?? [], publishedByProject.get(row.key) ?? null)),
      200,
    );
  })
  .openapi(getProject, async c => {
    const db = c.env.DB;
    const row = await requireProject(db, c.req.valid('param').project);

    const [projectVersions, published] = await Promise.all([versions(db, row.key), lastPublished(db, row.key)]);
    const keys = projectVersions.map(version => version.key);

    return c.json(projectDetail(projectSummary(row, keys, published), keys), 200);
  });
