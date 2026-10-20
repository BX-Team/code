import { getBuild, getLatestBuild, getVersion, listVersions } from '@bx-team/types/api';
import type { Build } from '@bx-team/types/schema/downloads';
import { notFound } from '@bx-team/worker/error';
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
import { buildResponse, versionSummary } from '../models/downloads';
import { router } from '../router';
import { newestFirst } from '../util/versions';

export const buildRoutes = router()
  .openapi(listVersions, async c => {
    const db = c.env.DB;
    const project = requireKind(await requireProject(db, c.req.valid('param').project), 'versioned');

    const rows = await versions(db, project.key);
    rows.sort((a, b) => newestFirst(a.key, b.key));

    const summaries = await Promise.all(
      rows.map(async row => {
        const [newest, count] = await Promise.all([latestBuild(db, row.id), buildCount(db, row.id)]);
        return versionSummary(row, newest?.number ?? null, count);
      }),
    );

    return c.json(summaries, 200);
  })
  .openapi(getVersion, async c => {
    const db = c.env.DB;
    const params = c.req.valid('param');
    const { limit, after } = c.req.valid('query');

    const project = requireKind(await requireProject(db, params.project), 'versioned');
    const version = await requireVersion(db, project.key, params.version);

    const [rows, newest, count] = await Promise.all([
      builds(db, version.id, limit + 1, after),
      latestBuild(db, version.id),
      buildCount(db, version.id),
    ]);

    const page = rows.slice(0, limit);
    const next = rows.length > limit ? String(page[page.length - 1]?.number) : null;

    return c.json(
      {
        ...versionSummary(version, newest?.number ?? null, count),
        builds: { items: await hydrate(db, project.key, version.key, page, c.env.R2_PUBLIC_URL), next },
      },
      200,
    );
  })
  .openapi(getLatestBuild, async c => {
    const db = c.env.DB;
    const params = c.req.valid('param');
    const project = requireKind(await requireProject(db, params.project), 'versioned');
    const version = await requireVersion(db, project.key, params.version);

    const row = await latestBuild(db, version.id);
    if (!row) throw notFound(`No builds for version '${version.key}' of project '${project.key}'`);

    const [built] = await hydrate(db, project.key, version.key, [row], c.env.R2_PUBLIC_URL);
    return c.json(built!, 200);
  })
  .openapi(getBuild, async c => {
    const db = c.env.DB;
    const params = c.req.valid('param');
    const project = requireKind(await requireProject(db, params.project), 'versioned');
    const version = await requireVersion(db, project.key, params.version);

    const row = await build(db, version.id, parseInt(params.build, 10));
    if (!row) {
      throw notFound(`Build '${params.build}' not found for version '${version.key}' of project '${project.key}'`);
    }

    const [built] = await hydrate(db, project.key, version.key, [row], c.env.R2_PUBLIC_URL);
    return c.json(built!, 200);
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
