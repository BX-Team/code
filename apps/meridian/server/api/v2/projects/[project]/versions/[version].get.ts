import { db } from '@bx-team/stratus';
import { atlasProjects, builds, versions } from '@bx-team/stratus/schema/atlas';
import { and, eq } from 'drizzle-orm';

export default defineEventHandler(async event => {
  const projectKey = getRouterParam(event, 'project')!;
  const versionKey = getRouterParam(event, 'version')!;

  try {
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

    const versionBuilds = await db.select().from(builds).where(eq(builds.versionId, version.id));

    return {
      version: {
        id: version.key,
        ...(version.javaMinVersion && { java: { version: { minimum: version.javaMinVersion } } }),
        support: { status: version.supportStatus.toUpperCase() as 'SUPPORTED' | 'DEPRECATED' | 'UNSUPPORTED' },
      },
      builds: versionBuilds.map(b => b.buildNumber).sort((a, b) => b - a),
    };
  } catch (error) {
    console.error('Error fetching version:', error);
    setResponseStatus(event, 500);
    return { ok: false, error: 'Internal Server Error', message: 'Failed to fetch version' };
  }
});
