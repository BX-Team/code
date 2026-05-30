import { db, issues, projects } from '@bx-team/stratus';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

const bodySchema = z.object({
  fingerprint: z.string().min(1).max(64),
  action: z.enum(['resolve', 'ignore', 'mute', 'reopen']),
  // Mute duration in hours; defaults to 24h. Ignored for other actions.
  hours: z.number().int().min(1).max(720).optional(),
});

export default defineEventHandler(async event => {
  const session = await requireAuth(event);
  const id = requireParam(event, 'id');

  const body = await readBody(event);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) throw createError({ statusCode: 400, message: parsed.error.message });

  const { fingerprint, action, hours } = parsed.data;

  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.ownerId, session.user.id)));

  if (!project) throw createError({ statusCode: 404, message: 'Project not found' });

  const [existing] = await db
    .select({ id: issues.id, lastVersion: issues.lastVersion })
    .from(issues)
    .where(and(eq(issues.projectId, id), eq(issues.fingerprint, fingerprint)));

  const now = new Date();
  const set: Partial<typeof issues.$inferInsert> = { resolvedBy: session.user.id };

  if (action === 'resolve') {
    set.status = 'resolved';
    set.resolvedAt = now;
    // Baseline for regression: recurrence on a version newer than this reopens the issue.
    set.statusVersion = existing?.lastVersion ?? null;
    set.mutedUntil = null;
  } else if (action === 'ignore') {
    set.status = 'ignored';
    set.resolvedAt = null;
    set.statusVersion = null;
    set.mutedUntil = null;
  } else if (action === 'mute') {
    set.status = 'muted';
    set.mutedUntil = new Date(now.getTime() + (hours ?? 24) * 3600_000);
    set.resolvedAt = null;
  } else {
    set.status = 'open';
    set.resolvedAt = null;
    set.statusVersion = null;
    set.mutedUntil = null;
  }

  if (existing) {
    await db.update(issues).set(set).where(eq(issues.id, existing.id));
  } else {
    // The registry row is normally created by cinder at ingest; fall back to creating it here
    // so a status set never silently no-ops on a not-yet-registered fingerprint.
    await db
      .insert(issues)
      .values({ projectId: id, fingerprint, firstSeenAt: now, lastSeenAt: now, ...set })
      .onConflictDoNothing({ target: [issues.projectId, issues.fingerprint] });
  }

  return { ok: true, fingerprint, status: set.status };
});
