import { db, errors, projects } from '@bx-team/stratus';
import { and, count, desc, eq } from 'drizzle-orm';

export default defineEventHandler(async event => {
  const session = await requireAuth(event);
  const id = requireParam(event, 'id');

  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.ownerId, session.user.id)));

  if (!project) throw createError({ statusCode: 404, message: 'Project not found' });

  const [rows, [total]] = await Promise.all([
    db
      .select({
        id: errors.id,
        plugin: errors.plugin,
        message: errors.message,
        stacktrace: errors.stacktrace,
        level: errors.level,
        count: errors.count,
        firstSeenAt: errors.firstSeenAt,
        lastSeenAt: errors.lastSeenAt,
      })
      .from(errors)
      .where(eq(errors.projectId, id))
      .orderBy(desc(errors.lastSeenAt))
      .limit(50),

    db.select({ total: count() }).from(errors).where(eq(errors.projectId, id)),
  ]);

  return { errors: rows, total: total?.total ?? 0 };
});
