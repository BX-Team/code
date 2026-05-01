import { db, dsnTokens, projects } from '@bx-team/stratus';
import { and, eq } from 'drizzle-orm';

export default defineEventHandler(async event => {
  const session = await requireAuth(event);
  const id = requireParam(event, 'id');

  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.ownerId, session.user.id)));

  if (!project) throw createError({ statusCode: 404, message: 'Project not found' });

  return db
    .select({
      id: dsnTokens.id,
      label: dsnTokens.label,
      revoked: dsnTokens.revoked,
      lastUsedAt: dsnTokens.lastUsedAt,
      createdAt: dsnTokens.createdAt,
    })
    .from(dsnTokens)
    .where(eq(dsnTokens.projectId, id));
});
