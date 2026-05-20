import { db } from '@bx-team/stratus';
import { atlasProjects, builds, commits, downloads, versions } from '@bx-team/stratus/schema/atlas';
import { UploadMetadataSchema } from '@bx-team/types/schema/atlas';
import { AwsClient } from 'aws4fetch';
import { and, desc, eq } from 'drizzle-orm';

export default defineEventHandler(async event => {
  const config = useRuntimeConfig(event);
  const auth = getHeader(event, 'Authorization');
  if (!auth || auth !== `Bearer ${config.apiSecretKey}`) {
    setResponseStatus(event, 401);
    return { ok: false, error: 'Unauthorized', message: 'Unauthorized' };
  }

  const projectKey = getRouterParam(event, 'project')!;
  const versionKey = getRouterParam(event, 'version')!;

  const r2 = new AwsClient({
    accessKeyId: config.r2AccessKeyId,
    secretAccessKey: config.r2SecretAccessKey,
    service: 's3',
    region: 'auto',
  });

  try {
    const parts = await readMultipartFormData(event);
    const filePart = parts?.find(p => p.name === 'file');

    if (!filePart?.data) {
      setResponseStatus(event, 400);
      return { ok: false, error: 'Bad Request', message: 'No file provided' };
    }

    const decodePart = (name: string) => {
      const part = parts?.find(p => p.name === name);
      return part?.data?.length ? new TextDecoder().decode(part.data) : undefined;
    };

    const metadataRaw = decodePart('metadata');
    const metadataInput: Record<string, unknown> = metadataRaw ? JSON.parse(metadataRaw) : {};

    if (metadataInput.buildNumber === undefined) {
      const raw = decodePart('buildNumber');
      if (raw !== undefined) metadataInput.buildNumber = Number(raw);
    }
    if (metadataInput.channel === undefined) {
      const raw = decodePart('channel');
      if (raw !== undefined) metadataInput.channel = raw;
    }
    if (metadataInput.commits === undefined) {
      const raw = decodePart('commits');
      if (raw !== undefined) metadataInput.commits = JSON.parse(raw);
    }

    const metadata = UploadMetadataSchema.parse(metadataInput);

    const [project] = await db.select().from(atlasProjects).where(eq(atlasProjects.key, projectKey)).limit(1);

    if (!project) {
      setResponseStatus(event, 404);
      return { ok: false, error: 'Not Found', message: `Project '${projectKey}' not found` };
    }

    const [version] = await db
      .select()
      .from(versions)
      .where(and(eq(versions.projectId, project.id), eq(versions.key, versionKey)))
      .limit(1);

    if (!version) {
      setResponseStatus(event, 404);
      return {
        ok: false,
        error: 'Not Found',
        message: `Version '${versionKey}' not found for project '${projectKey}'`,
      };
    }

    let buildNumber = metadata.buildNumber;
    if (!buildNumber) {
      const [lastBuild] = await db
        .select()
        .from(builds)
        .where(eq(builds.versionId, version.id))
        .orderBy(desc(builds.buildNumber))
        .limit(1);
      buildNumber = lastBuild ? lastBuild.buildNumber + 1 : 1;
    }

    const fileBytes = new Uint8Array(filePart.data);
    const fileName = filePart.filename ?? 'upload.jar';
    const r2Key = `${projectKey}/versions/${versionKey}/${buildNumber}/${fileName}`;

    const hashBuffer = await crypto.subtle.digest('SHA-256', fileBytes);
    const sha256 = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const channelValue = (metadata.channel?.toUpperCase() || 'STABLE') as 'ALPHA' | 'BETA' | 'STABLE';

    const uploadUrl = `${config.r2Endpoint}/${config.r2Bucket}/${r2Key}`;
    const uploadResponse = await r2.fetch(uploadUrl, {
      method: 'PUT',
      body: fileBytes,
      headers: {
        'Content-Type': fileName.endsWith('.jar') ? 'application/java-archive' : 'application/octet-stream',
      },
    });

    if (!uploadResponse.ok) {
      setResponseStatus(event, 500);
      return {
        ok: false,
        error: 'Internal Server Error',
        message: `Failed to upload file to R2: ${uploadResponse.statusText}`,
      };
    }

    const insertedBuild = await db.transaction(async tx => {
      const [created] = await tx
        .insert(builds)
        .values({ versionId: version.id, buildNumber, channel: channelValue, time: new Date() })
        .returning();

      if (!created) throw new Error('Failed to insert build');

      if (metadata.commits?.length) {
        await tx.insert(commits).values(
          metadata.commits.map(c => ({
            buildId: created.id,
            sha: c.sha,
            message: c.message,
            time: new Date(c.time),
          })),
        );
      }

      await tx.insert(downloads).values({
        buildId: created.id,
        name: 'application',
        fileName,
        filePath: r2Key,
        size: fileBytes.length,
        sha256,
      });

      return created;
    });

    setResponseStatus(event, 200);
    return {
      message: 'Build uploaded successfully',
      build: {
        id: buildNumber,
        project: projectKey,
        version: versionKey,
        channel: channelValue,
      },
    };
  } catch (error) {
    console.error('Error uploading build:', error);
    const err = error as { message?: string; cause?: unknown };
    const cause = err.cause as { message?: string; code?: string; detail?: string } | undefined;
    const causeText = cause
      ? [cause.code && `[${cause.code}]`, cause.message, cause.detail].filter(Boolean).join(' ')
      : '';
    setResponseStatus(event, 500);
    return {
      ok: false,
      error: 'Internal Server Error',
      message: `Failed to upload build: ${err.message ?? 'Unknown error'}${causeText ? ` — ${causeText}` : ''}`,
    };
  }
});
