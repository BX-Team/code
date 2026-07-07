import { pluginInstallations, projects, serverMetadata } from '@bx-team/stratus/d1';
import type { Heartbeat } from '@bx-team/types/schema/pulsify';
import { and, inArray, sql } from 'drizzle-orm';
import type { HandlerContext } from '../env';
import { writeServerStats } from '../lib/analytics';

export async function handleHeartbeat(ctx: HandlerContext, event: Heartbeat, projectId: string, countryCode: string) {
  const { db, env } = ctx;
  const now = new Date();

  await db
    .insert(serverMetadata)
    .values({
      projectId,
      software: event.server.software,
      mcVersion: event.server.version,
      countryCode,
      lastSeenAt: now,
    })
    .onConflictDoUpdate({
      target: serverMetadata.projectId,
      set: {
        software: event.server.software,
        mcVersion: event.server.version,
        countryCode,
        lastSeenAt: now,
      },
    });

  writeServerStats(env, projectId, {
    online: event.server.online,
    tps: event.server.tps,
    mspt: event.server.mspt,
    memoryUsed: event.server.memory_used_mb,
    memoryMax: event.server.memory_max_mb,
  });

  try {
    if (event.plugins.length > 0) {
      const infoByName = new Map(event.plugins.map(p => [p.name, p]));
      const matchedPlugins = await db
        .select({ id: projects.id, name: projects.name })
        .from(projects)
        .where(and(inArray(projects.name, [...infoByName.keys()]), inArray(projects.type, ['plugin', 'mod'])));

      const rows = matchedPlugins.flatMap(pp => {
        const info = infoByName.get(pp.name);
        if (!info) return [];
        return [
          {
            pluginId: pp.id,
            serverId: projectId,
            version: info.version,
            enabled: info.enabled,
            shareErrors: true,
            lastSeenAt: now,
          },
        ];
      });

      if (rows.length > 0) {
        await db
          .insert(pluginInstallations)
          .values(rows)
          .onConflictDoUpdate({
            target: [pluginInstallations.pluginId, pluginInstallations.serverId],
            set: {
              version: sql`excluded.version`,
              enabled: sql`excluded.enabled`,
              lastSeenAt: now,
            },
          });
      }
    }
  } catch (err) {
    console.error('[heartbeat] Failed to update plugin installations:', err);
  }
}
