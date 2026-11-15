import { deleteBuild, nextBuild, patchProject, patchVersion, publishBuild } from '@bx-team/types/api';
import { PublishBuildSchema, type PublishCommit } from '@bx-team/types/schema/downloads';
import { badRequest, internal, notFound } from '@bx-team/worker/error';
import { sha256Hex } from '@bx-team/worker/hex';
import type { RouteConfig } from '@hono/zod-openapi';
import { type AppEnv, requireVersion } from '../context';
import { build, commitsOf, downloadsOf } from '../database/downloads';
import {
  attach,
  deleteBuild as deleteBuildRow,
  ensureVersion,
  type NewDownload,
  nextBuildNumber,
  patchProject as patchProjectRow,
  patchVersion as patchVersionRow,
  upsertBuild,
} from '../database/publish';
import { buildResponse } from '../models/downloads';
import { router } from '../router';
import { purge } from '../util/cache';
import { requireToken } from '../util/token';
import { announcePublish } from '../util/webhook';

/**
 * `requireToken` sits on every route rather than on a `use('/publish/*')`: a guard
 * mounted on a wildcard path cannot read `:project`, which is what it authorises against.
 */
const guarded = <R extends RouteConfig>(route: R) => ({ ...route, middleware: requireToken });

export const publishRoutes = router()
  /**
   * The number the next build takes. A workflow needs it before it uploads, because the
   * jar's own name carries it, and reading it here rather than from `github.run_number`
   * is what keeps the sequence gapless when a run fails.
   */
  .openapi(guarded(nextBuild), async c => {
    const project = c.get('project');
    const version = await ensureVersion(c.env.DB, project.key, c.req.valid('param').version);
    if (!version) throw internal('Failed to create version');

    return c.json(
      { project: project.key, version: version.key, next: await nextBuildNumber(c.env.DB, version.id) },
      200,
    );
  })
  .openapi(guarded(publishBuild), async c => {
    const db = c.env.DB;
    const project = c.get('project');

    const { file, name, body } = uploaded(c.req.valid('form'));
    const metadata = PublishBuildSchema.safeParse(body);
    if (!metadata.success) throw badRequest(metadata.error.message);

    const version = await ensureVersion(db, project.key, c.req.valid('param').version);
    if (!version) throw internal('Failed to create version');

    const number = metadata.data.build ?? (await nextBuildNumber(db, version.id));
    const existing = await build(db, version.id, number);

    const download = await store(
      c.env.BUCKET,
      `${project.key}/versions/${version.key}/${number}/${name}`,
      file,
      name,
      metadata.data.name,
    );

    const row = await upsertBuild(db, version.id, number, metadata.data.channel, metadata.data.commit ?? null);
    if (!row) throw internal('Failed to insert build');

    await commit(db, c.env.BUCKET, row.id, metadata.data.commits, download, existing ? null : row.id);

    const [commits, downloads] = await Promise.all([commitsOf(db, [row.id]), downloadsOf(db, [row.id])]);
    const published = buildResponse(
      row,
      project.key,
      version.key,
      commits.get(row.id) ?? [],
      downloads.get(row.id) ?? [],
      c.env.R2_PUBLIC_URL,
    );

    const origin = new URL(c.req.url).origin;
    c.executionCtx.waitUntil(
      purge(origin, [
        '/v1/projects',
        `/v1/projects/${project.key}`,
        `/v1/builds/${project.key}`,
        `/v1/builds/${project.key}/${version.key}`,
        `/v1/builds/${project.key}/${version.key}?limit=25`,
        `/v1/builds/${project.key}/${version.key}/latest`,
        `/v1/builds/${project.key}/${version.key}/${number}`,
      ]).then(() =>
        announcePublish(c.env.BOT_WEBHOOK_URL, c.env.BOT_WEBHOOK_SECRET, {
          event: 'publish',
          project: project.key,
          version: version.key,
          build: number,
        }),
      ),
    );

    return c.json(published, 200);
  })
  .openapi(guarded(patchProject), async c => {
    await patchProjectRow(c.env.DB, c.get('project').key, c.req.valid('json'));
    return c.json({ ok: true }, 200);
  })
  .openapi(guarded(patchVersion), async c => {
    const project = c.get('project');
    const version = await requireVersion(c.env.DB, project.key, c.req.valid('param').version);

    await patchVersionRow(c.env.DB, version.id, c.req.valid('json'));
    return c.json({ ok: true }, 200);
  })
  // The bucket is opened before the row: the other order can orphan an object.
  .openapi(guarded(deleteBuild), async c => {
    const db = c.env.DB;
    const params = c.req.valid('param');
    const project = c.get('project');
    const version = await requireVersion(db, project.key, params.version);

    const row = await build(db, version.id, parseInt(params.build, 10));
    if (!row) throw notFound(`Build '${params.build}' not found for version '${version.key}'`);

    const downloads = (await downloadsOf(db, [row.id])).get(row.id) ?? [];
    await Promise.all(downloads.map(download => c.env.BUCKET.delete(download.file_path)));
    await deleteBuildRow(db, row.id);

    return c.json({ ok: true }, 200);
  });

/** The publish body: a file and a JSON `metadata` part. */
function uploaded(form: { file: File; metadata?: string }): { file: File; name: string; body: unknown } {
  const name = fileName(form.file.name);

  try {
    return { file: form.file, name, body: form.metadata ? JSON.parse(form.metadata) : {} };
  } catch {
    throw badRequest('metadata is not valid JSON');
  }
}

/** The name arrives inside the body, so it never gets to walk out of its own prefix. */
function fileName(raw: string): string {
  const name = raw
    .split('/')
    .pop()
    ?.replace(/[^\w.+-]/g, '_');
  if (!name || name.startsWith('.')) throw badRequest(`Unusable file name '${raw}'`);
  return name;
}

async function store(
  bucket: AppEnv['Bindings']['BUCKET'],
  key: string,
  file: File,
  fileName: string,
  name: string,
): Promise<NewDownload> {
  const bytes = await file.arrayBuffer();

  await bucket.put(key, bytes, {
    httpMetadata: {
      contentType: fileName.endsWith('.jar') ? 'application/java-archive' : 'application/octet-stream',
    },
  });

  return { name, fileName, filePath: key, size: bytes.byteLength, sha256: await sha256Hex(bytes) };
}

/**
 * Commits the children of a publish, compensating what was already written when the batch
 * fails: the object always, and the build row only when this publish is what created it.
 */
async function commit(
  db: AppEnv['Bindings']['DB'],
  bucket: AppEnv['Bindings']['BUCKET'],
  id: number,
  commits: PublishCommit[],
  download: NewDownload,
  createdId: number | null,
): Promise<void> {
  try {
    await attach(db, id, commits, download);
  } catch (error) {
    await bucket.delete(download.filePath);
    if (createdId !== null) {
      await deleteBuildRow(db, createdId);
    }
    throw error;
  }
}
