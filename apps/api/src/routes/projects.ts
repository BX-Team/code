import { Hono } from 'hono';
import { type AppEnv, requireProject } from '../context';
import {
  allLastPublished,
  allNewestTags,
  allVersionKeys,
  lastPublished,
  latestRelease,
  projects,
  releases,
  versions,
} from '../database/downloads';
import { projectDetail, projectSummary } from '../models/downloads';

export const projectRoutes = new Hono<AppEnv>();

projectRoutes.get('/projects', async c => {
  const db = c.env.DB;
  const [rows, versionKeys, published, newestTags] = await Promise.all([
    projects(db),
    allVersionKeys(db),
    allLastPublished(db),
    allNewestTags(db),
  ]);

  const keysByProject = new Map<string, string[]>();
  for (const row of versionKeys) {
    keysByProject.set(row.project, [...(keysByProject.get(row.project) ?? []), row.key]);
  }
  const publishedByProject = new Map(published.map(row => [row.project, row.at]));
  const tagByProject = new Map(newestTags.map(row => [row.project, row.tag]));

  return c.json(
    rows.map(row =>
      projectSummary(
        row,
        keysByProject.get(row.key) ?? [],
        publishedByProject.get(row.key) ?? null,
        tagByProject.get(row.key) ?? null,
      ),
    ),
  );
});

projectRoutes.get('/projects/:project', async c => {
  const db = c.env.DB;
  const row = await requireProject(db, c.req.param('project'));

  const [projectVersions, projectReleases, published] = await Promise.all([
    versions(db, row.key),
    row.kind === 'release' ? releases(db, row.key) : Promise.resolve([]),
    lastPublished(db, row.key),
  ]);

  const newestTag = row.kind === 'release' ? ((await latestRelease(db, row.key))?.tag ?? null) : null;
  const summary = projectSummary(
    row,
    projectVersions.map(version => version.key),
    published,
    newestTag,
  );

  return c.json(
    projectDetail(
      summary,
      projectVersions.map(version => version.key),
      projectReleases.map(release => release.tag),
    ),
  );
});
