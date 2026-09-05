import {
  ProjectPatchSchema,
  PublishBuildSchema,
  type PublishCommit,
  PublishReleaseSchema,
  VersionPatchSchema,
} from '@bx-team/types/schema/downloads';
import { type Context, Hono } from 'hono';
import { type AppEnv, requireKind, requireVersion } from '../context';
import { build, commitsOf, downloadsOf, release } from '../database/downloads';
import {
  attach,
  deleteBuild,
  deleteRelease,
  ensureVersion,
  type NewDownload,
  nextBuildNumber,
  patchProject,
  patchVersion,
  upsertBuild,
  upsertRelease,
} from '../database/publish';
import { buildResponse, releaseResponse } from '../models/downloads';
import { purge } from '../util/cache';
import { badRequest, internal, notFound } from '../util/error';
import { sha256Hex } from '../util/hex';
import { requireToken } from '../util/token';
import { announcePublish } from '../util/webhook';

export const publishRoutes = new Hono<AppEnv>();

/**
 * `requireToken` sits on every route rather than on a `use('/publish/*')`: a guard
 * mounted on a wildcard path cannot read `:project`, which is what it authorises against.
 *
 * The number the next build takes. A workflow needs it before it uploads, because the
 * jar's own name carries it, and reading it here rather than from `github.run_number`
 * is what keeps the sequence gapless when a run fails.
 */
publishRoutes.get('/publish/next/:project/:version', requireToken, async c => {
  const project = requireKind(c.get('project'), 'versioned');
  const versionKey = c.req.param('version');
  const version = await ensureVersion(c.env.DB, project.key, versionKey);
  if (!version) throw internal('Failed to create version');

  return c.json({ project: project.key, version: version.key, next: await nextBuildNumber(c.env.DB, version.id) });
});

publishRoutes.post('/publish/builds/:project/:version', requireToken, async c => {
  const db = c.env.DB;
  const project = requireKind(c.get('project'), 'versioned');
  const versionKey = c.req.param('version');

  const { file, name, body } = await uploaded(c);
  const metadata = PublishBuildSchema.safeParse(body);
  if (!metadata.success) throw badRequest(metadata.error.message);

  const version = await ensureVersion(db, project.key, versionKey);
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

  await commit(db, c.env.BUCKET, 'build', row.id, metadata.data.commits, download, existing ? null : row.id);

  const [commits, downloads] = await Promise.all([
    commitsOf(db, 'build', [row.id]),
    downloadsOf(db, 'build', [row.id]),
  ]);
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
      announcePublish(c.env.BEACON_PUBLISH_URL, c.env.BEACON_WEBHOOK_SECRET, {
        event: 'publish',
        kind: 'build',
        project: project.key,
        version: version.key,
        build: number,
      }),
    ),
  );

  return c.json(published);
});

publishRoutes.post('/publish/releases/:project/:tag', requireToken, async c => {
  const db = c.env.DB;
  const project = requireKind(c.get('project'), 'release');
  const tag = c.req.param('tag');

  const { file, name, body } = await uploaded(c);
  const metadata = PublishReleaseSchema.safeParse(body);
  if (!metadata.success) throw badRequest(metadata.error.message);

  const existing = await release(db, project.key, tag);
  const download = await store(c.env.BUCKET, `${project.key}/releases/${tag}/${name}`, file, name, metadata.data.name);

  const row = await upsertRelease(
    db,
    project.key,
    tag,
    metadata.data.channel,
    metadata.data.commit ?? null,
    metadata.data.notes ?? null,
  );
  if (!row) throw internal('Failed to insert release');

  await commit(db, c.env.BUCKET, 'release', row.id, metadata.data.commits, download, existing ? null : row.id);

  const [commits, downloads] = await Promise.all([
    commitsOf(db, 'release', [row.id]),
    downloadsOf(db, 'release', [row.id]),
  ]);
  const published = releaseResponse(row, commits.get(row.id) ?? [], downloads.get(row.id) ?? [], c.env.R2_PUBLIC_URL);

  const origin = new URL(c.req.url).origin;
  c.executionCtx.waitUntil(
    purge(origin, [
      '/v1/projects',
      `/v1/projects/${project.key}`,
      `/v1/releases/${project.key}`,
      `/v1/releases/${project.key}/latest`,
      `/v1/releases/${project.key}/${tag}`,
    ]).then(() =>
      announcePublish(c.env.BEACON_PUBLISH_URL, c.env.BEACON_WEBHOOK_SECRET, {
        event: 'publish',
        kind: 'release',
        project: project.key,
        tag,
      }),
    ),
  );

  return c.json(published);
});

publishRoutes.patch('/publish/projects/:project', requireToken, async c => {
  const patch = ProjectPatchSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!patch.success) throw badRequest(patch.error.message);

  await patchProject(c.env.DB, c.get('project').key, patch.data);
  return c.json({ ok: true });
});

publishRoutes.patch('/publish/versions/:project/:version', requireToken, async c => {
  const patch = VersionPatchSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!patch.success) throw badRequest(patch.error.message);

  const project = requireKind(c.get('project'), 'versioned');
  const version = await requireVersion(c.env.DB, project.key, c.req.param('version'));

  await patchVersion(c.env.DB, version.id, patch.data);
  return c.json({ ok: true });
});

/** The bucket is opened before the row: the other order can orphan an object. */
publishRoutes.delete('/publish/builds/:project/:version/:build', requireToken, async c => {
  const db = c.env.DB;
  const project = requireKind(c.get('project'), 'versioned');
  const version = await requireVersion(db, project.key, c.req.param('version'));

  const number = parseInt(c.req.param('build'), 10);
  const row = Number.isNaN(number) ? null : await build(db, version.id, number);
  if (!row) throw notFound(`Build '${c.req.param('build')}' not found for version '${version.key}'`);

  const downloads = (await downloadsOf(db, 'build', [row.id])).get(row.id) ?? [];
  await Promise.all(downloads.map(download => c.env.BUCKET.delete(download.file_path)));
  await deleteBuild(db, row.id);

  return c.json({ ok: true });
});

publishRoutes.delete('/publish/releases/:project/:tag', requireToken, async c => {
  const db = c.env.DB;
  const project = requireKind(c.get('project'), 'release');
  const tag = c.req.param('tag');

  const row = await release(db, project.key, tag);
  if (!row) throw notFound(`Release '${tag}' not found for project '${project.key}'`);

  const downloads = (await downloadsOf(db, 'release', [row.id])).get(row.id) ?? [];
  await Promise.all(downloads.map(download => c.env.BUCKET.delete(download.file_path)));
  await deleteRelease(db, row.id);

  return c.json({ ok: true });
});

/** The one multipart shape both publish endpoints take: a file and a JSON `metadata` part. */
async function uploaded(c: Context<AppEnv>): Promise<{ file: File; name: string; body: unknown }> {
  const form = await c.req.parseBody().catch(() => null);
  if (!form) throw badRequest('Expected a multipart/form-data body');

  const file = form.file;
  if (!(file instanceof File) || !file.name) throw badRequest('No file provided');

  const metadata = form.metadata;
  if (metadata !== undefined && typeof metadata !== 'string') throw badRequest('metadata must be a JSON string');

  try {
    return { file, name: fileName(file.name), body: metadata ? JSON.parse(metadata) : {} };
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
 * fails: the object always, and the parent row only when this publish is what created it.
 */
async function commit(
  db: AppEnv['Bindings']['DB'],
  bucket: AppEnv['Bindings']['BUCKET'],
  owner: 'build' | 'release',
  id: number,
  commits: PublishCommit[],
  download: NewDownload,
  createdId: number | null,
): Promise<void> {
  try {
    await attach(db, owner, id, commits, download);
  } catch (error) {
    await bucket.delete(download.filePath);
    if (createdId !== null) {
      await (owner === 'build' ? deleteBuild(db, createdId) : deleteRelease(db, createdId));
    }
    throw error;
  }
}
