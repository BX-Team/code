import { db, projects } from '@bx-team/stratus';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async event => {
  const session = await requireAuth(event);
  if (session.user.role !== 'admin') throw createError({ statusCode: 403, message: 'Forbidden' });

  const id = getRouterParam(event, 'id')!;

  return db
    .select({
      id: projects.id,
      name: projects.name,
      slug: projects.slug,
      type: projects.type,
      description: projects.description,
      verified: projects.verified,
      createdAt: projects.createdAt,
    })
    .from(projects)
    .where(eq(projects.ownerId, id));
});
