import { Hono } from 'hono';
import { type AppEnv, requireKind, requireProject } from '../context';
import { commitsOf, downloadsOf, latestRelease, type ReleaseRow, release, releases } from '../database/downloads';
import { type Release, releaseResponse } from '../models/downloads';
import { notFound } from '../util/error';

export const releaseRoutes = new Hono<AppEnv>();

releaseRoutes.get('/releases/:project', async c => {
  const db = c.env.DB;
  const project = requireKind(await requireProject(db, c.req.param('project')), 'release');

  return c.json(await hydrate(db, await releases(db, project.key), c.env.R2_PUBLIC_URL));
});

releaseRoutes.get('/releases/:project/latest', async c => {
  const db = c.env.DB;
  const project = requireKind(await requireProject(db, c.req.param('project')), 'release');

  const row = await latestRelease(db, project.key);
  if (!row) throw notFound(`Project '${project.key}' has no releases`);

  const [built] = await hydrate(db, [row], c.env.R2_PUBLIC_URL);
  return c.json(built);
});

releaseRoutes.get('/releases/:project/:tag', async c => {
  const db = c.env.DB;
  const tag = c.req.param('tag');
  const project = requireKind(await requireProject(db, c.req.param('project')), 'release');

  const row = await release(db, project.key, tag);
  if (!row) throw notFound(`Release '${tag}' not found for project '${project.key}'`);

  const [built] = await hydrate(db, [row], c.env.R2_PUBLIC_URL);
  return c.json(built);
});

async function hydrate(db: AppEnv['Bindings']['DB'], rows: ReleaseRow[], publicUrl: string): Promise<Release[]> {
  const ids = rows.map(row => row.id);
  const [commits, downloads] = await Promise.all([commitsOf(db, 'release', ids), downloadsOf(db, 'release', ids)]);

  return rows.map(row => releaseResponse(row, commits.get(row.id) ?? [], downloads.get(row.id) ?? [], publicUrl));
}
