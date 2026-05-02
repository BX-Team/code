import { db } from '@bx-team/stratus'
import { atlasProjects, versions } from '@bx-team/stratus/schema/atlas'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  try {
    const allProjects = await db.select().from(atlasProjects)

    const projectsResponse = await Promise.all(
      allProjects.map(async (project) => {
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
      }),
    )

    return { projects: projectsResponse }
  } catch (error) {
    console.error('Error fetching projects:', error)
    setResponseStatus(event, 500)
    return { ok: false, error: 'Internal Server Error', message: 'Failed to fetch projects' }
  }
})
