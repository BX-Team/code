import { db } from '@bx-team/stratus'
import { atlasProjects, versions } from '@bx-team/stratus/schema/atlas'
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

    return {
      project: {
        id: project.key,
        name: project.name,
        ...(project.description && { description: project.description }),
        ...(project.latestVersion && { latestVersion: project.latestVersion }),
        ...(project.experimentalVersion && { experimentalVersion: project.experimentalVersion }),
      },
      version_groups: groupVersions(projectVersions.map(v => v.key)),
    }
  } catch (error) {
    console.error('Error fetching project:', error)
    setResponseStatus(event, 500)
    return { ok: false, error: 'Internal Server Error', message: 'Failed to fetch project' }
  }
})
