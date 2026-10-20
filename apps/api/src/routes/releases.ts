import { getLatestRelease, getRelease, listReleases } from '@bx-team/types/api';
import type { Release } from '@bx-team/types/schema/downloads';
import { notFound } from '@bx-team/worker/error';
import { type AppEnv, requireKind, requireProject } from '../context';
import { commitsOf, downloadsOf, latestRelease, type ReleaseRow, release, releases } from '../database/downloads';
import { releaseResponse } from '../models/downloads';
import { router } from '../router';

export const releaseRoutes = router()
  .openapi(listReleases, async c => {
    const db = c.env.DB;
    const project = requireKind(await requireProject(db, c.req.valid('param').project), 'release');

    return c.json(await hydrate(db, await releases(db, project.key), c.env.R2_PUBLIC_URL), 200);
  })
  .openapi(getLatestRelease, async c => {
    const db = c.env.DB;
    const project = requireKind(await requireProject(db, c.req.valid('param').project), 'release');

    const row = await latestRelease(db, project.key);
    if (!row) throw notFound(`Project '${project.key}' has no releases`);

    const [built] = await hydrate(db, [row], c.env.R2_PUBLIC_URL);
    return c.json(built!, 200);
  })
  .openapi(getRelease, async c => {
    const db = c.env.DB;
    const { tag, ...params } = c.req.valid('param');
    const project = requireKind(await requireProject(db, params.project), 'release');

    const row = await release(db, project.key, tag);
    if (!row) throw notFound(`Release '${tag}' not found for project '${project.key}'`);

    const [built] = await hydrate(db, [row], c.env.R2_PUBLIC_URL);
    return c.json(built!, 200);
  });

async function hydrate(db: AppEnv['Bindings']['DB'], rows: ReleaseRow[], publicUrl: string): Promise<Release[]> {
  const ids = rows.map(row => row.id);
  const [commits, downloads] = await Promise.all([commitsOf(db, 'release', ids), downloadsOf(db, 'release', ids)]);

  return rows.map(row => releaseResponse(row, commits.get(row.id) ?? [], downloads.get(row.id) ?? [], publicUrl));
}
