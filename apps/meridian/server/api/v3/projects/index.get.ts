import { db, projects } from '@bx-team/stratus';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async event => {
  const session = await requireAuth(event);

  return db
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
});
