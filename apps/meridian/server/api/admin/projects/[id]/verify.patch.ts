import { db, projects } from '@bx-team/stratus';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const bodySchema = z.object({ verified: z.boolean() });

export default defineEventHandler(async event => {
  const session = await requireAuth(event);
  if (session.user.role !== 'admin') throw createError({ statusCode: 403, message: 'Forbidden' });

  const id = getRouterParam(event, 'id')!;
  const parsed = bodySchema.safeParse(await readBody(event));
  if (!parsed.success) throw createError({ statusCode: 400, message: parsed.error.message });

  const [project] = await db.select({ id: projects.id, type: projects.type }).from(projects).where(eq(projects.id, id));
  if (!project) throw createError({ statusCode: 404, message: 'Project not found' });
  if (project.type === 'server')
    throw createError({ statusCode: 400, message: 'Only plugin/mod projects can be verified' });

  const [updated] = await db
    .update(projects)
    .set({ verified: parsed.data.verified, updatedAt: new Date() })
    .where(eq(projects.id, id))
    .returning({ id: projects.id, verified: projects.verified });

  return updated;
});
