import { db, pluginInstallations, projects, serverMetadata } from '@bx-team/stratus';
import type { Heartbeat } from '@bx-team/types/schema/pulsify';
import { and, inArray, sql } from 'drizzle-orm';
import { clickhouse } from '../lib/clickhouse';

export async function handleHeartbeat(event: Heartbeat, projectId: string, countryCode: string) {
  await db
    .insert(serverMetadata)
    .values({
      projectId,
      software: event.server.software,
      mcVersion: event.server.version,
      countryCode,
      lastSeenAt: new Date(),
    })
    .onConflictDoUpdate({
      target: serverMetadata.projectId,
      set: {
        software: event.server.software,
        mcVersion: event.server.version,
        countryCode,
        lastSeenAt: new Date(),
      },
    });

  await clickhouse.insert({
    table: 'server_stats',
    values: [
      {
        project_id: projectId,
        timestamp: new Date(event.timestamp).toISOString().slice(0, 19).replace('T', ' '),
        online: event.server.online,
        tps: event.server.tps,
        mspt: event.server.mspt,
        memory_used: event.server.memory_used_mb,
        memory_max: event.server.memory_max_mb,
      },
    ],
    format: 'JSONEachRow',
  });

  try {
    if (event.plugins.length > 0) {
      const pluginNames = event.plugins.map(p => p.name);
      const matchedPlugins = await db
        .select({ id: projects.id, name: projects.name })
        .from(projects)
        .where(and(inArray(projects.name, pluginNames), inArray(projects.type, ['plugin', 'mod'] as const)));

      if (matchedPlugins.length > 0) {
        const now = new Date();
        await db
          .insert(pluginInstallations)
          .values(
            matchedPlugins.map(pp => {
              const info = event.plugins.find(p => p.name === pp.name)!;
              return {
                pluginId: pp.id,
                serverId: projectId,
                version: info.version,
                enabled: info.enabled,
                shareErrors: true,
                lastSeenAt: now,
              };
            }),
          )
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
