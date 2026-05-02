import { db } from '@bx-team/stratus'
import { atlasProjects, builds, commits, downloads, versions } from '@bx-team/stratus/schema/atlas'
import { and, eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const projectKey = getRouterParam(event, 'project')!
  const versionKey = getRouterParam(event, 'version')!
  const buildParam = getRouterParam(event, 'build')!
  const config = useRuntimeConfig(event)

  if (!/^\d+$/.test(buildParam)) {
    setResponseStatus(event, 400)
    return { ok: false, error: 'Bad Request', message: 'Build number must be a positive integer' }
  }

  const buildNumber = parseInt(buildParam, 10)

  try {
    const [project] = await db.select().from(atlasProjects).where(eq(atlasProjects.key, projectKey)).limit(1)

    if (!project) {
      setResponseStatus(event, 404)
      return { ok: false, error: 'Not Found', message: `Project '${projectKey}' not found` }
    }

    const [version] = await db
      .select()
      .from(versions)
      .where(and(eq(versions.projectId, project.id), eq(versions.key, versionKey)))
      .limit(1)

    if (!version) {
      setResponseStatus(event, 404)
      return { ok: false, error: 'Not Found', message: `Version '${versionKey}' not found for project '${projectKey}'` }
    }

    const [build] = await db
      .select()
      .from(builds)
      .where(and(eq(builds.versionId, version.id), eq(builds.buildNumber, buildNumber)))
      .limit(1)

    if (!build) {
      setResponseStatus(event, 404)
      return {
        ok: false,
        error: 'Not Found',
        message: `Build '${buildNumber}' not found for version '${versionKey}' of project '${projectKey}'`,
      }
    }

    const buildCommits = await db.select().from(commits).where(eq(commits.buildId, build.id))
    const buildDownloads = await db.select().from(downloads).where(eq(downloads.buildId, build.id))

    const downloadsMap: Record<string, { name: string; checksums: { sha256: string }; size: number; url: string }> = {}
    for (const dl of buildDownloads) {
      downloadsMap[dl.name] = {
        name: dl.fileName,
        checksums: { sha256: dl.sha256 },
        size: dl.size,
        url: `${config.r2PublicUrl}/${dl.filePath}`,
      }
    }

    return {
      id: build.buildNumber,
      time: build.time.toISOString(),
      channel: build.channel.toUpperCase() as 'ALPHA' | 'BETA' | 'STABLE',
      commits: buildCommits.map(c => ({ sha: c.sha, message: c.message, time: c.time.toISOString() })),
      downloads: downloadsMap,
    }
  } catch (error) {
    console.error('Error fetching build:', error)
    setResponseStatus(event, 500)
    return { ok: false, error: 'Internal Server Error', message: 'Failed to fetch build' }
  }
})
