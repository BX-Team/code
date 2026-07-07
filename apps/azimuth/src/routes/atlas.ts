import { type AtlasDb, atlasProjects, builds, commits, createAtlasDb, downloads, versions } from '@bx-team/stratus/d1';
import { BuildsQuerySchema, CreateVersionBodySchema, UploadMetadataSchema } from '@bx-team/types/schema/atlas';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { Hono } from 'hono';
import { createMiddleware } from 'hono/factory';
import type { Env } from '../env';
import { groupVersions } from '../lib/versions';
import { edgeCache } from '../middleware/cache';

/**
 * Atlas/Downloads route group — project, version and build metadata backed by atlas-db
 * and the ATLAS_BUCKET R2 binding. Public GETs go through the edge cache.
 */

type AtlasEnv = { Bindings: Env };

type ProjectRow = typeof atlasProjects.$inferSelect;
type VersionRow = typeof versions.$inferSelect;
type BuildRow = typeof builds.$inferSelect;
type CommitRow = typeof commits.$inferSelect;
type DownloadRow = typeof downloads.$inferSelect;

const requireApiSecret = createMiddleware<AtlasEnv>(async (c, next) => {
  const auth = c.req.header('Authorization');
  if (!auth || auth !== `Bearer ${c.env.API_SECRET_KEY}`) {
    return c.json({ ok: false, error: 'Unauthorized', message: 'Unauthorized' }, 401);
  }
  await next();
});

function projectResponse(project: ProjectRow, versionKeys: string[]) {
  return {
    project: {
      id: project.key,
      name: project.name,
      ...(project.description && { description: project.description }),
      ...(project.latestVersion && { latestVersion: project.latestVersion }),
      ...(project.experimentalVersion && { experimentalVersion: project.experimentalVersion }),
    },
    version_groups: groupVersions(versionKeys),
  };
}

function versionResponse(version: VersionRow, buildNumbers: number[]) {
  return {
    version: {
      id: version.key,
      ...(version.javaMinVersion && { java: { version: { minimum: version.javaMinVersion } } }),
      support: { status: version.supportStatus },
    },
    builds: buildNumbers.sort((a, b) => b - a),
  };
}

function buildResponse(build: BuildRow, buildCommits: CommitRow[], buildDownloads: DownloadRow[], publicUrl: string) {
  const downloadsMap: Record<string, { name: string; checksums: { sha256: string }; size: number; url: string }> = {};
  for (const dl of buildDownloads) {
    downloadsMap[dl.name] = {
      name: dl.fileName,
      checksums: { sha256: dl.sha256 },
      size: dl.size,
      url: `${publicUrl}/${dl.filePath}`,
    };
  }

  return {
    id: build.buildNumber,
    time: build.time.toISOString(),
    channel: build.channel,
    commits: buildCommits.map(c => ({ sha: c.sha, message: c.message, time: c.time.toISOString() })),
    downloads: downloadsMap,
  };
}

async function findProject(db: AtlasDb, projectKey: string) {
  const [project] = await db.select().from(atlasProjects).where(eq(atlasProjects.key, projectKey)).limit(1);
  return project;
}

async function findVersion(db: AtlasDb, projectId: number, versionKey: string) {
  const [version] = await db
    .select()
    .from(versions)
    .where(and(eq(versions.projectId, projectId), eq(versions.key, versionKey)))
    .limit(1);
  return version;
}

/** Batched (non-N+1) commit/download lookups for a set of builds. */
async function buildDetails(db: AtlasDb, buildIds: number[]) {
  const [allCommits, allDownloads] = buildIds.length
    ? await Promise.all([
        db.select().from(commits).where(inArray(commits.buildId, buildIds)),
        db.select().from(downloads).where(inArray(downloads.buildId, buildIds)),
      ])
    : [[], []];

  const commitsByBuild = new Map<number, CommitRow[]>();
  for (const commit of allCommits) {
    commitsByBuild.set(commit.buildId, [...(commitsByBuild.get(commit.buildId) ?? []), commit]);
  }
  const downloadsByBuild = new Map<number, DownloadRow[]>();
  for (const download of allDownloads) {
    downloadsByBuild.set(download.buildId, [...(downloadsByBuild.get(download.buildId) ?? []), download]);
  }

  return { commitsByBuild, downloadsByBuild };
}

export const atlas = new Hono<AtlasEnv>();

atlas.use('/*', edgeCache);

atlas.get('/projects', async c => {
  const db = createAtlasDb(c.env.ATLAS_DB);

  try {
    const allProjects = await db.select().from(atlasProjects);
    const allVersions = allProjects.length
      ? await db
          .select()
          .from(versions)
          .where(
            inArray(
              versions.projectId,
              allProjects.map(p => p.id),
            ),
          )
      : [];

    const versionKeysByProject = new Map<number, string[]>();
    for (const version of allVersions) {
      versionKeysByProject.set(version.projectId, [
        ...(versionKeysByProject.get(version.projectId) ?? []),
        version.key,
      ]);
    }

    return c.json({
      projects: allProjects.map(project => projectResponse(project, versionKeysByProject.get(project.id) ?? [])),
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return c.json({ ok: false, error: 'Internal Server Error', message: 'Failed to fetch projects' }, 500);
  }
});

atlas.get('/projects/:project', async c => {
  const db = createAtlasDb(c.env.ATLAS_DB);
  const projectKey = c.req.param('project');

  try {
    const project = await findProject(db, projectKey);
    if (!project) {
      return c.json({ ok: false, error: 'Not Found', message: `Project '${projectKey}' not found` }, 404);
    }

    const projectVersions = await db.select().from(versions).where(eq(versions.projectId, project.id));

    return c.json(
      projectResponse(
        project,
        projectVersions.map(v => v.key),
      ),
    );
  } catch (error) {
    console.error('Error fetching project:', error);
    return c.json({ ok: false, error: 'Internal Server Error', message: 'Failed to fetch project' }, 500);
  }
});

atlas.get('/projects/:project/versions', async c => {
  const db = createAtlasDb(c.env.ATLAS_DB);
  const projectKey = c.req.param('project');

  try {
    const project = await findProject(db, projectKey);
    if (!project) {
      return c.json({ ok: false, error: 'Not Found', message: `Project '${projectKey}' not found` }, 404);
    }

    const projectVersions = await db.select().from(versions).where(eq(versions.projectId, project.id));
    const versionBuilds = projectVersions.length
      ? await db
          .select()
          .from(builds)
          .where(
            inArray(
              builds.versionId,
              projectVersions.map(v => v.id),
            ),
          )
      : [];

    const buildNumbersByVersion = new Map<number, number[]>();
    for (const build of versionBuilds) {
      buildNumbersByVersion.set(build.versionId, [
        ...(buildNumbersByVersion.get(build.versionId) ?? []),
        build.buildNumber,
      ]);
    }

    return c.json(
      projectVersions.map(version => versionResponse(version, buildNumbersByVersion.get(version.id) ?? [])),
    );
  } catch (error) {
    console.error('Error fetching versions:', error);
    return c.json({ ok: false, error: 'Internal Server Error', message: 'Failed to fetch versions' }, 500);
  }
});

atlas.post('/projects/:project/versions/create', requireApiSecret, async c => {
  const db = createAtlasDb(c.env.ATLAS_DB);
  const projectKey = c.req.param('project');

  try {
    const parsed = CreateVersionBodySchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) {
      return c.json({ ok: false, error: 'Bad Request', message: parsed.error.message }, 400);
    }
    const body = parsed.data;

    const project = await findProject(db, projectKey);
    if (!project) {
      return c.json({ ok: false, error: 'Not Found', message: `Project '${projectKey}' not found` }, 404);
    }

    const existingVersion = await findVersion(db, project.id, body.key);
    if (existingVersion) {
      return c.json(
        { ok: false, error: 'Conflict', message: `Version '${body.key}' already exists for project '${projectKey}'` },
        409,
      );
    }

    const [version] = await db
      .insert(versions)
      .values({
        projectId: project.id,
        key: body.key,
        supportStatus: body.supportStatus ?? 'SUPPORTED',
        javaMinVersion: body.javaMinVersion ?? null,
      })
      .returning();

    if (!version) {
      return c.json({ ok: false, error: 'Internal Server Error', message: 'Failed to create version' }, 500);
    }

    return c.json(
      {
        message: 'Version created successfully',
        version: {
          id: version.id,
          project: projectKey,
          key: version.key,
          supportStatus: version.supportStatus,
          javaMinVersion: version.javaMinVersion,
        },
      },
      201,
    );
  } catch (error) {
    console.error('Error creating version:', error);
    return c.json(
      {
        ok: false,
        error: 'Internal Server Error',
        message: `Failed to create version: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      500,
    );
  }
});

atlas.get('/projects/:project/versions/:version', async c => {
  const db = createAtlasDb(c.env.ATLAS_DB);
  const projectKey = c.req.param('project');
  const versionKey = c.req.param('version');

  try {
    const project = await findProject(db, projectKey);
    if (!project) {
      return c.json({ ok: false, error: 'Not Found', message: `Project '${projectKey}' not found` }, 404);
    }

    const version = await findVersion(db, project.id, versionKey);
    if (!version) {
      return c.json(
        { ok: false, error: 'Not Found', message: `Version '${versionKey}' not found for project '${projectKey}'` },
        404,
      );
    }

    const versionBuilds = await db.select().from(builds).where(eq(builds.versionId, version.id));

    return c.json(
      versionResponse(
        version,
        versionBuilds.map(b => b.buildNumber),
      ),
    );
  } catch (error) {
    console.error('Error fetching version:', error);
    return c.json({ ok: false, error: 'Internal Server Error', message: 'Failed to fetch version' }, 500);
  }
});

atlas.get('/projects/:project/versions/:version/builds', async c => {
  const db = createAtlasDb(c.env.ATLAS_DB);
  const projectKey = c.req.param('project');
  const versionKey = c.req.param('version');

  const parsedQuery = BuildsQuerySchema.safeParse(c.req.query());
  if (!parsedQuery.success) {
    return c.json({ ok: false, error: 'Bad Request', message: parsedQuery.error.message }, 400);
  }
  const { channel: channelFilter } = parsedQuery.data;

  try {
    const project = await findProject(db, projectKey);
    if (!project) {
      return c.json({ ok: false, error: 'Not Found', message: `Project '${projectKey}' not found` }, 404);
    }

    const version = await findVersion(db, project.id, versionKey);
    if (!version) {
      return c.json(
        { ok: false, error: 'Not Found', message: `Version '${versionKey}' not found for project '${projectKey}'` },
        404,
      );
    }

    const conditions = [eq(builds.versionId, version.id)];
    if (channelFilter) conditions.push(eq(builds.channel, channelFilter));

    const versionBuilds = await db
      .select()
      .from(builds)
      .where(and(...conditions))
      .orderBy(desc(builds.buildNumber));

    const { commitsByBuild, downloadsByBuild } = await buildDetails(
      db,
      versionBuilds.map(b => b.id),
    );

    return c.json(
      versionBuilds.map(build =>
        buildResponse(
          build,
          commitsByBuild.get(build.id) ?? [],
          downloadsByBuild.get(build.id) ?? [],
          c.env.R2_PUBLIC_URL,
        ),
      ),
    );
  } catch (error) {
    console.error('Error fetching builds:', error);
    return c.json({ ok: false, error: 'Internal Server Error', message: 'Failed to fetch builds' }, 500);
  }
});

atlas.get('/projects/:project/versions/:version/builds/latest', async c => {
  const db = createAtlasDb(c.env.ATLAS_DB);
  const projectKey = c.req.param('project');
  const versionKey = c.req.param('version');

  try {
    const project = await findProject(db, projectKey);
    if (!project) {
      return c.json({ ok: false, error: 'Not Found', message: `Project '${projectKey}' not found` }, 404);
    }

    const version = await findVersion(db, project.id, versionKey);
    if (!version) {
      return c.json(
        { ok: false, error: 'Not Found', message: `Version '${versionKey}' not found for project '${projectKey}'` },
        404,
      );
    }

    const [build] = await db
      .select()
      .from(builds)
      .where(eq(builds.versionId, version.id))
      .orderBy(desc(builds.buildNumber))
      .limit(1);

    if (!build) {
      return c.json(
        {
          ok: false,
          error: 'Not Found',
          message: `No builds found for version '${versionKey}' of project '${projectKey}'`,
        },
        404,
      );
    }

    const { commitsByBuild, downloadsByBuild } = await buildDetails(db, [build.id]);

    return c.json(
      buildResponse(
        build,
        commitsByBuild.get(build.id) ?? [],
        downloadsByBuild.get(build.id) ?? [],
        c.env.R2_PUBLIC_URL,
      ),
    );
  } catch (error) {
    console.error('Error fetching latest build:', error);
    return c.json({ ok: false, error: 'Internal Server Error', message: 'Failed to fetch latest build' }, 500);
  }
});

atlas.get('/projects/:project/versions/:version/builds/:build', async c => {
  const db = createAtlasDb(c.env.ATLAS_DB);
  const projectKey = c.req.param('project');
  const versionKey = c.req.param('version');
  const buildParam = c.req.param('build');

  if (!/^\d+$/.test(buildParam)) {
    return c.json({ ok: false, error: 'Bad Request', message: 'Build number must be a positive integer' }, 400);
  }
  const buildNumber = parseInt(buildParam, 10);

  try {
    const project = await findProject(db, projectKey);
    if (!project) {
      return c.json({ ok: false, error: 'Not Found', message: `Project '${projectKey}' not found` }, 404);
    }

    const version = await findVersion(db, project.id, versionKey);
    if (!version) {
      return c.json(
        { ok: false, error: 'Not Found', message: `Version '${versionKey}' not found for project '${projectKey}'` },
        404,
      );
    }

    const [build] = await db
      .select()
      .from(builds)
      .where(and(eq(builds.versionId, version.id), eq(builds.buildNumber, buildNumber)))
      .limit(1);

    if (!build) {
      return c.json(
        {
          ok: false,
          error: 'Not Found',
          message: `Build '${buildNumber}' not found for version '${versionKey}' of project '${projectKey}'`,
        },
        404,
      );
    }

    const { commitsByBuild, downloadsByBuild } = await buildDetails(db, [build.id]);

    return c.json(
      buildResponse(
        build,
        commitsByBuild.get(build.id) ?? [],
        downloadsByBuild.get(build.id) ?? [],
        c.env.R2_PUBLIC_URL,
      ),
    );
  } catch (error) {
    console.error('Error fetching build:', error);
    return c.json({ ok: false, error: 'Internal Server Error', message: 'Failed to fetch build' }, 500);
  }
});

atlas.post('/projects/:project/versions/:version/builds/upload', requireApiSecret, async c => {
  const db = createAtlasDb(c.env.ATLAS_DB);
  const projectKey = c.req.param('project');
  const versionKey = c.req.param('version');

  try {
    const body = await c.req.parseBody();
    const filePart = body.file;

    if (!(filePart instanceof File)) {
      return c.json({ ok: false, error: 'Bad Request', message: 'No file provided' }, 400);
    }

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

    const metadata = UploadMetadataSchema.parse(metadataInput);

    const project = await findProject(db, projectKey);
    if (!project) {
      return c.json({ ok: false, error: 'Not Found', message: `Project '${projectKey}' not found` }, 404);
    }

    const version = await findVersion(db, project.id, versionKey);
    if (!version) {
      return c.json(
        { ok: false, error: 'Not Found', message: `Version '${versionKey}' not found for project '${projectKey}'` },
        404,
      );
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

    const fileBytes = new Uint8Array(await filePart.arrayBuffer());
    const fileName = filePart.name || 'upload.jar';
    const r2Key = `${projectKey}/versions/${versionKey}/${buildNumber}/${fileName}`;

    const hashBuffer = await crypto.subtle.digest('SHA-256', fileBytes);
    const sha256 = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const channelValue = (metadata.channel?.toUpperCase() || 'STABLE') as 'ALPHA' | 'BETA' | 'STABLE';

    await c.env.ATLAS_BUCKET.put(r2Key, fileBytes, {
      httpMetadata: {
        contentType: fileName.endsWith('.jar') ? 'application/java-archive' : 'application/octet-stream',
      },
    });

    const [created] = await db
      .insert(builds)
      .values({ versionId: version.id, buildNumber, channel: channelValue, time: new Date() })
      .returning();

    if (!created) {
      return c.json({ ok: false, error: 'Internal Server Error', message: 'Failed to insert build' }, 500);
    }

    // D1 has no interactive transactions; db.batch() is the atomic unit, and the
    // build row is compensated away if the child inserts fail.
    try {
      const downloadInsert = db.insert(downloads).values({
        buildId: created.id,
        name: 'application',
        fileName,
        filePath: r2Key,
        size: fileBytes.length,
        sha256,
      });

      if (metadata.commits?.length) {
        await db.batch([
          db.insert(commits).values(
            metadata.commits.map(commit => ({
              buildId: created.id,
              sha: commit.sha,
              message: commit.message,
              time: new Date(commit.time),
            })),
          ),
          downloadInsert,
        ]);
      } else {
        await downloadInsert;
      }
    } catch (error) {
      await db.delete(builds).where(eq(builds.id, created.id));
      throw error;
    }

    return c.json({
      message: 'Build uploaded successfully',
      build: {
        id: buildNumber,
        project: projectKey,
        version: versionKey,
        channel: channelValue,
      },
    });
  } catch (error) {
    console.error('Error uploading build:', error);
    return c.json(
      {
        ok: false,
        error: 'Internal Server Error',
        message: `Failed to upload build: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      500,
    );
  }
});
