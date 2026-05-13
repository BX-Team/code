import { db, serverMetadata } from '@bx-team/stratus';
import type { Heartbeat } from '@bx-team/types/schema/pulsify';
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
      },
    ],
    format: 'JSONEachRow',
  });
}
