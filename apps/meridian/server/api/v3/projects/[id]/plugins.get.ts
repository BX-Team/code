import { db, pluginInstallations, projects } from '@bx-team/stratus';
import { and, eq } from 'drizzle-orm';

export default defineEventHandler(async event => {
  const session = await requireAuth(event);
  const id = requireParam(event, 'id');

  const [project] = await db
    .select({ id: projects.id, type: projects.type })
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.ownerId, session.user.id)));

  if (!project) throw createError({ statusCode: 404, message: 'Project not found' });
  if (project.type === 'server') throw createError({ statusCode: 400, message: 'Not applicable for server projects' });

  const installs = await db
    .select({
      version: pluginInstallations.version,
      enabled: pluginInstallations.enabled,
      lastSeenAt: pluginInstallations.lastSeenAt,
    })
    .from(pluginInstallations)
    .where(eq(pluginInstallations.pluginId, id));

  const total = installs.length;
  const enabled = installs.filter(i => i.enabled).length;

  const versionCounts = new Map<string, number>();
  for (const i of installs) {
    versionCounts.set(i.version, (versionCounts.get(i.version) ?? 0) + 1);
  }

  const versions = [...versionCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([version, count]) => ({
      version,
      count,
      pct: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
    }));

  const latestVersion = versions[0]?.version ?? null;

  return {
    total_installs: total,
    enabled_installs: enabled,
    latest_version: latestVersion,
    latest_version_adoption: latestVersion ? (versions.find(v => v.version === latestVersion)?.pct ?? 0) : 0,
    versions,
  };
});
