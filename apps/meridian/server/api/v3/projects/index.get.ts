import { db, issues, projects, serverMetadata } from '@bx-team/stratus';
import { and, eq, inArray, ne } from 'drizzle-orm';

export default defineEventHandler(async event => {
  const session = await requireAuth(event);

  const owned = await db
    .select({
      id: projects.id,
      name: projects.name,
      slug: projects.slug,
      type: projects.type,
      description: projects.description,
      createdAt: projects.createdAt,
    })
    .from(projects)
    .where(eq(projects.ownerId, session.user.id));

  if (!owned.length) return [];

  const projectIds = owned.map(p => p.id);

  const [lastSeenRows, resolvedRows, errorFingerprints] = await Promise.all([
    db
      .select({ projectId: serverMetadata.projectId, lastSeenAt: serverMetadata.lastSeenAt })
      .from(serverMetadata)
      .where(inArray(serverMetadata.projectId, projectIds)),
    db
      .select({ projectId: issues.projectId, fingerprint: issues.fingerprint })
      .from(issues)
      .where(and(inArray(issues.projectId, projectIds), ne(issues.status, 'open'))),
    clickhouse
      .query({
        query: `
          SELECT project_id, fingerprint
          FROM error_events
          WHERE project_id IN ({projectIds: Array(String)}) AND fingerprint != ''
          GROUP BY project_id, fingerprint
        `,
        query_params: { projectIds },
        format: 'JSONEachRow',
      })
      .then(r => r.json<{ project_id: string; fingerprint: string }[]>())
      .catch(() => [] as { project_id: string; fingerprint: string }[]),
  ]);

  const lastSeenByProject = new Map(lastSeenRows.map(r => [r.projectId, r.lastSeenAt]));
  const resolvedByProject = new Map<string, Set<string>>();
  for (const r of resolvedRows) {
    if (!resolvedByProject.has(r.projectId)) resolvedByProject.set(r.projectId, new Set());
    resolvedByProject.get(r.projectId)?.add(r.fingerprint);
  }
  const errorsByProject = new Map<string, number>();
  for (const row of errorFingerprints) {
    if (resolvedByProject.get(row.project_id)?.has(row.fingerprint)) continue;
    errorsByProject.set(row.project_id, (errorsByProject.get(row.project_id) ?? 0) + 1);
  }

  return owned.map(p => ({
    ...p,
    lastSeenAt: lastSeenByProject.get(p.id) ?? null,
    errors: errorsByProject.get(p.id) ?? 0,
  }));
});
