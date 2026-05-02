import { db } from '@bx-team/stratus'
import { atlasProjects, builds, versions } from '@bx-team/stratus/schema/atlas'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const projectKey = getRouterParam(event, 'project')!

  try {
    const [project] = await db.select().from(atlasProjects).where(eq(atlasProjects.key, projectKey)).limit(1)

    if (!project) {
      setResponseStatus(event, 404)
      return { ok: false, error: 'Not Found', message: `Project '${projectKey}' not found` }
    }

    const projectVersions = await db.select().from(versions).where(eq(versions.projectId, project.id))

    const versionResponses = await Promise.all(
      projectVersions.map(async (version) => {
        const versionBuilds = await db.select().from(builds).where(eq(builds.versionId, version.id))

        return {
          version: {
            id: version.key,
            ...(version.javaMinVersion && { java: { version: { minimum: version.javaMinVersion } } }),
            support: { status: version.supportStatus.toUpperCase() as 'SUPPORTED' | 'DEPRECATED' | 'UNSUPPORTED' },
          },
          builds: versionBuilds.map(b => b.buildNumber).sort((a, b) => b - a),
        }
      }),
    )

    return versionResponses
  } catch (error) {
    console.error('Error fetching versions:', error)
    setResponseStatus(event, 500)
    return { ok: false, error: 'Internal Server Error', message: 'Failed to fetch versions' }
  }
})
