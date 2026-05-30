import { db, projects, quotas } from '@bx-team/stratus';
import { and, count, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';

const bodySchema = z.object({
  name: z.string().min(1).max(64),
  slug: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9-]+$/),
  type: z.enum(['server', 'plugin', 'mod']),
  description: z.string().max(256).optional(),
});

export default defineEventHandler(async event => {
  const session = await requireAuth(event);

  const body = await readBody(event);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) throw createError({ statusCode: 400, message: parsed.error.message });

  const { name, slug, type, description } = parsed.data;

  // Enforce the per-user project quota (defaults apply when the user has no quota row yet).
  const [[quota], [projectCount]] = await Promise.all([
    db.select({ maxProjects: quotas.maxProjects }).from(quotas).where(eq(quotas.userId, session.user.id)),
    db.select({ count: count() }).from(projects).where(eq(projects.ownerId, session.user.id)),
  ]);
  const maxProjects = quota?.maxProjects ?? 10;
  if ((projectCount?.count ?? 0) >= maxProjects) {
    throw createError({ statusCode: 403, message: `Project limit reached (${maxProjects}).` });
  }

  // Plugin/mod names are globally unique — they are the key cross-server error aggregation
  // matches on, so two projects can't claim the same name.
  if (type === 'plugin' || type === 'mod') {
    const [existing] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.name, name), inArray(projects.type, ['plugin', 'mod'])));
    if (existing) {
      throw createError({ statusCode: 409, message: `A plugin or mod named "${name}" already exists.` });
    }
  }

  const [project] = await db
    .insert(projects)
    .values({ name, slug, type, description, ownerId: session.user.id })
    .returning({
      id: projects.id,
      name: projects.name,
      slug: projects.slug,
      type: projects.type,
    });

  setResponseStatus(event, 201);
  return project;
});
