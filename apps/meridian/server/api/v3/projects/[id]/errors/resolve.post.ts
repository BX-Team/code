import { db, projects, resolvedIssues } from '@bx-team/stratus';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

const bodySchema = z.object({
  fingerprint: z.string().min(1).max(64),
  resolved: z.boolean(),
});

export default defineEventHandler(async event => {
  const session = await requireAuth(event);
  const id = requireParam(event, 'id');

  const body = await readBody(event);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) throw createError({ statusCode: 400, message: parsed.error.message });

  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.ownerId, session.user.id)));

  if (!project) throw createError({ statusCode: 404, message: 'Project not found' });

  if (parsed.data.resolved) {
    await db
      .insert(resolvedIssues)
      .values({
        projectId: id,
        fingerprint: parsed.data.fingerprint,
        resolvedBy: session.user.id,
      })
      .onConflictDoUpdate({
        target: [resolvedIssues.projectId, resolvedIssues.fingerprint],
        set: { resolvedAt: new Date(), resolvedBy: session.user.id },
      });
  } else {
    await db
      .delete(resolvedIssues)
      .where(and(eq(resolvedIssues.projectId, id), eq(resolvedIssues.fingerprint, parsed.data.fingerprint)));
  }

  return { ok: true, fingerprint: parsed.data.fingerprint, resolved: parsed.data.resolved };
});
