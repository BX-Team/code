import { PageQuerySchema } from '@bx-team/types/schema/downloads';
import { Hono } from 'hono';
import { type AppEnv, requireKind, requireProject, requireVersion } from '../context';
import {
  type BuildRow,
  build,
  buildCount,
  builds,
  commitsOf,
  downloadsOf,
  latestBuild,
  versions,
} from '../database/downloads';
import { type Build, buildResponse, type Page, versionSummary } from '../models/downloads';
import { badRequest, notFound } from '../util/error';
import { newestFirst } from '../util/versions';

export const buildRoutes = new Hono<AppEnv>();

buildRoutes.get('/builds/:project', async c => {
  const db = c.env.DB;
  const project = requireKind(await requireProject(db, c.req.param('project')), 'versioned');

  const rows = await versions(db, project.key);
  rows.sort((a, b) => newestFirst(a.key, b.key));

  const summaries = await Promise.all(
    rows.map(async row => {
      const [newest, count] = await Promise.all([latestBuild(db, row.id), buildCount(db, row.id)]);
      return versionSummary(row, newest?.number ?? null, count);
    }),
  );

  return c.json(summaries);
});

buildRoutes.get('/builds/:project/:version', async c => {
  const db = c.env.DB;
  const query = PageQuerySchema.safeParse(c.req.query());
  if (!query.success) throw badRequest(query.error.message);

  const project = requireKind(await requireProject(db, c.req.param('project')), 'versioned');
  const version = await requireVersion(db, project.key, c.req.param('version'));

  const { limit, after } = query.data;
  const [rows, newest, count] = await Promise.all([
    builds(db, version.id, limit + 1, after),
    latestBuild(db, version.id),
    buildCount(db, version.id),
  ]);

  const page = rows.slice(0, limit);
  const next = rows.length > limit ? String(page[page.length - 1]?.number) : null;

  return c.json({
    ...versionSummary(version, newest?.number ?? null, count),
    builds: {
      items: await hydrate(c.env.DB, project.key, version.key, page, c.env.R2_PUBLIC_URL),
      next,
    } satisfies Page<Build>,
  });
});

buildRoutes.get('/builds/:project/:version/latest', async c => {
  const db = c.env.DB;
  const project = requireKind(await requireProject(db, c.req.param('project')), 'versioned');
  const version = await requireVersion(db, project.key, c.req.param('version'));

  const row = await latestBuild(db, version.id);
  if (!row) throw notFound(`No builds for version '${version.key}' of project '${project.key}'`);

  const [built] = await hydrate(db, project.key, version.key, [row], c.env.R2_PUBLIC_URL);
  return c.json(built);
});

buildRoutes.get('/builds/:project/:version/:build', async c => {
  const db = c.env.DB;
  const number = c.req.param('build');
  if (!/^\d+$/.test(number)) throw badRequest('Build number must be a positive integer');

  const project = requireKind(await requireProject(db, c.req.param('project')), 'versioned');
  const version = await requireVersion(db, project.key, c.req.param('version'));

  const row = await build(db, version.id, parseInt(number, 10));
  if (!row) throw notFound(`Build '${number}' not found for version '${version.key}' of project '${project.key}'`);

  const [built] = await hydrate(db, project.key, version.key, [row], c.env.R2_PUBLIC_URL);
  return c.json(built);
});

/** Commits and downloads for a whole page in two statements rather than two per build. */
async function hydrate(
  db: AppEnv['Bindings']['DB'],
  projectKey: string,
  versionKey: string,
  rows: BuildRow[],
  publicUrl: string,
): Promise<Build[]> {
  const ids = rows.map(row => row.id);
  const [commits, downloads] = await Promise.all([commitsOf(db, 'build', ids), downloadsOf(db, 'build', ids)]);

  return rows.map(row =>
    buildResponse(row, projectKey, versionKey, commits.get(row.id) ?? [], downloads.get(row.id) ?? [], publicUrl),
  );
}
