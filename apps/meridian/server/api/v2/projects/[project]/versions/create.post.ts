import { db } from '@bx-team/stratus';
import { atlasProjects, versions } from '@bx-team/stratus/schema/atlas';
import { CreateVersionBodySchema } from '@bx-team/types/schema/atlas';
import { and, eq } from 'drizzle-orm';

export default defineEventHandler(async event => {
  const config = useRuntimeConfig(event);
  const auth = getHeader(event, 'Authorization');
  if (!auth || auth !== `Bearer ${config.apiSecretKey}`) {
    setResponseStatus(event, 401);
    return { ok: false, error: 'Unauthorized', message: 'Unauthorized' };
  }

  const projectKey = getRouterParam(event, 'project')!;

  try {
    const body = await readValidatedBody(event, CreateVersionBodySchema.parse);

    const [project] = await db.select().from(atlasProjects).where(eq(atlasProjects.key, projectKey)).limit(1);

    if (!project) {
      setResponseStatus(event, 404);
      return { ok: false, error: 'Not Found', message: `Project '${projectKey}' not found` };
    }

    const [existingVersion] = await db
      .select()
      .from(versions)
      .where(and(eq(versions.projectId, project.id), eq(versions.key, body.key)))
      .limit(1);

    if (existingVersion) {
      setResponseStatus(event, 409);
      return {
        ok: false,
        error: 'Conflict',
        message: `Version '${body.key}' already exists for project '${projectKey}'`,
      };
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
      setResponseStatus(event, 500);
      return { ok: false, error: 'Internal Server Error', message: 'Failed to create version' };
    }

    setResponseStatus(event, 201);
    return {
      message: 'Version created successfully',
      version: {
        id: version.id,
        project: projectKey,
        key: version.key,
        supportStatus: version.supportStatus,
        javaMinVersion: version.javaMinVersion,
      },
    };
  } catch (error) {
    console.error('Error creating version:', error);
    setResponseStatus(event, 500);
    return {
      ok: false,
      error: 'Internal Server Error',
      message: `Failed to create version: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
});
