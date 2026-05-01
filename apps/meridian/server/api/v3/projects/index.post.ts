import { db, projects } from '@bx-team/stratus';
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
