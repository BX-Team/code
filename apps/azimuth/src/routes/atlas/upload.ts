import { UploadMetadataSchema } from '@bx-team/types/schema/atlas';
import { Hono } from 'hono';
import {
  atlasDb,
  attachBuildArtifacts,
  type Channel,
  createBuild,
  deleteBuild,
  nextBuildNumber,
} from '../../database/models/atlas';
import { badRequest, internal } from '../../util/error';
import { requireApiSecret } from '../../util/secret';
import { type AtlasEnv, requireProject, requireVersion } from './context';

export const upload = new Hono<AtlasEnv>();

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

upload.post('/projects/:project/versions/:version/builds/upload', requireApiSecret, async c => {
  const db = atlasDb(c.env.ATLAS_DB);
  const projectKey = c.req.param('project');
  const versionKey = c.req.param('version');

  const body = await c.req.parseBody();
  const filePart = body.file;
  if (!(filePart instanceof File)) throw badRequest('No file provided');

  const textPart = (name: string) => {
    const part = body[name];
    return typeof part === 'string' && part.length ? part : undefined;
  };

  const metadataRaw = textPart('metadata');
  const metadataInput: Record<string, unknown> = metadataRaw ? JSON.parse(metadataRaw) : {};

  if (metadataInput.buildNumber === undefined) {
    const raw = textPart('buildNumber');
    if (raw !== undefined) metadataInput.buildNumber = Number(raw);
  }
  if (metadataInput.channel === undefined) {
    const raw = textPart('channel');
    if (raw !== undefined) metadataInput.channel = raw;
  }
  if (metadataInput.commits === undefined) {
    const raw = textPart('commits');
    if (raw !== undefined) metadataInput.commits = JSON.parse(raw);
  }

  const parsed = UploadMetadataSchema.safeParse(metadataInput);
  if (!parsed.success) throw badRequest(parsed.error.message);
  const metadata = parsed.data;

  const project = await requireProject(db, projectKey);
  const version = await requireVersion(db, project.id, projectKey, versionKey);

  const buildNumber = metadata.buildNumber || (await nextBuildNumber(db, version.id));
  const fileBytes = new Uint8Array(await filePart.arrayBuffer());
  const fileName = filePart.name || 'upload.jar';
  const filePath = `${projectKey}/versions/${versionKey}/${buildNumber}/${fileName}`;
  const channel = (metadata.channel?.toUpperCase() || 'STABLE') as Channel;

  await c.env.ATLAS_BUCKET.put(filePath, fileBytes, {
    httpMetadata: {
      contentType: fileName.endsWith('.jar') ? 'application/java-archive' : 'application/octet-stream',
    },
  });

  const created = await createBuild(db, version.id, buildNumber, channel);
  if (!created) throw internal('Failed to insert build');

  try {
    await attachBuildArtifacts(
      db,
      created.id,
      { name: 'application', fileName, filePath, size: fileBytes.length, sha256: await sha256Hex(fileBytes) },
      metadata.commits ?? [],
    );
  } catch (error) {
    await deleteBuild(db, created.id);
    throw error;
  }

  return c.json({
    message: 'Build uploaded successfully',
    build: { id: buildNumber, project: projectKey, version: versionKey, channel },
  });
});
