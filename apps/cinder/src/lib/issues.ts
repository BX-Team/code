import { db, issues } from '@bx-team/stratus';
import { and, eq } from 'drizzle-orm';
import { isNewerVersion } from './version';

export type IssueTransition = 'new_issue' | 'regression' | null;

/**
 * Upserts the canonical issue registry for an incoming error and reports any lifecycle
 * transition worth alerting on. A first-ever fingerprint is a `new_issue`; a fingerprint
 * that was previously resolved but recurs on a newer version is a `regression` (auto-reopened).
 * Plain recurrences just bump last-seen metadata.
 */
export async function recordIssue(params: {
  projectId: string;
  fingerprint: string;
  plugin: string;
  version: string;
}): Promise<IssueTransition> {
  const { projectId, fingerprint, plugin, version } = params;
  const now = new Date();

  const inserted = await db
    .insert(issues)
    .values({
      projectId,
      fingerprint,
      plugin,
      status: 'open',
      firstVersion: version || null,
      lastVersion: version || null,
      firstSeenAt: now,
      lastSeenAt: now,
    })
    .onConflictDoNothing({ target: [issues.projectId, issues.fingerprint] })
    .returning({ id: issues.id });

  if (inserted.length > 0) return 'new_issue';

  const [cur] = await db
    .select({
      status: issues.status,
      statusVersion: issues.statusVersion,
      mutedUntil: issues.mutedUntil,
    })
    .from(issues)
    .where(and(eq(issues.projectId, projectId), eq(issues.fingerprint, fingerprint)));

  if (!cur) return null;

  const set: Partial<typeof issues.$inferInsert> = { lastSeenAt: now };
  if (version) set.lastVersion = version;
  let transition: IssueTransition = null;

  if (cur.status === 'resolved' && isRegression(version, cur.statusVersion)) {
    set.status = 'open';
    set.resolvedAt = null;
    set.statusVersion = null;
    transition = 'regression';
  } else if (cur.status === 'muted' && cur.mutedUntil && cur.mutedUntil.getTime() < now.getTime()) {
    // Mute window elapsed — drop back to open without alerting.
    set.status = 'open';
    set.mutedUntil = null;
  }

  await db
    .update(issues)
    .set(set)
    .where(and(eq(issues.projectId, projectId), eq(issues.fingerprint, fingerprint)));

  return transition;
}

function isRegression(incoming: string, fixedIn: string | null): boolean {
  if (!incoming) return false; // no version evidence that anything changed
  if (!fixedIn) return true; // resolved without version context — any recurrence reopens
  return isNewerVersion(incoming, fixedIn);
}
