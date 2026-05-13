import { createHash } from 'node:crypto';
import { db, errors } from '@bx-team/stratus';
import type { ErrorEvent } from '@bx-team/types/schema/pulsify';
import { sql } from 'drizzle-orm';

export async function handleErrorEvent(event: ErrorEvent, projectId: string) {
  const stacktrace = event.error.stacktrace ?? '';
  const hash = createHash('sha256')
    .update(event.error.message + stacktrace)
    .digest('hex');

  await db
    .insert(errors)
    .values({
      projectId,
      plugin: event.plugin,
      message: event.error.message,
      stacktrace,
      level: event.error.level,
      hash,
    })
    .onConflictDoUpdate({
      target: [errors.projectId, errors.hash],
      set: {
        count: sql`${errors.count} + 1`,
        lastSeenAt: new Date(),
      },
    });
}
