import { randomBytes } from 'node:crypto';
import { db, dsnTokens, projects } from '@bx-team/stratus';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

const bodySchema = z.object({
  label: z.string().min(1).max(64).optional(),
});

export default defineEventHandler(async event => {
  const session = await requireAuth(event);
  const id = requireParam(event, 'id');

  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.ownerId, session.user.id)));

  if (!project) throw createError({ statusCode: 404, message: 'Project not found' });

  const body = await readBody(event);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) throw createError({ statusCode: 400, message: parsed.error.message });

  const key = randomBytes(32).toString('hex');

  const [token] = await db
    .insert(dsnTokens)
    .values({ projectId: id, key, label: parsed.data.label ?? null })
    .returning({
      id: dsnTokens.id,
      key: dsnTokens.key,
      label: dsnTokens.label,
      createdAt: dsnTokens.createdAt,
    });

  setResponseStatus(event, 201);
  return token;
});
