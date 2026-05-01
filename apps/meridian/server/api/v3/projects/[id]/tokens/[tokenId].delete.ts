import { db, dsnTokens, projects } from '@bx-team/stratus';
import { and, eq } from 'drizzle-orm';

export default defineEventHandler(async event => {
  const session = await requireAuth(event);
  const id = requireParam(event, 'id');
  const tokenId = requireParam(event, 'tokenId');

  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.ownerId, session.user.id)));

  if (!project) throw createError({ statusCode: 404, message: 'Project not found' });

  const [token] = await db
    .update(dsnTokens)
    .set({ revoked: true })
    .where(and(eq(dsnTokens.id, tokenId), eq(dsnTokens.projectId, id)))
    .returning({ id: dsnTokens.id });

  if (!token) throw createError({ statusCode: 404, message: 'Token not found' });

  setResponseStatus(event, 204);
  return null;
});
