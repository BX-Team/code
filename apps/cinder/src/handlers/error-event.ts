import type { ErrorEvent } from '@bx-team/types/schema/pulsify';
import { clickhouse } from '../lib/clickhouse';

export async function handleErrorEvent(event: ErrorEvent, projectId: string) {
  await clickhouse.insert({
    table: 'error_events',
    values: [
      {
        project_id: projectId,
        plugin: event.plugin,
        message: event.error.message,
        stacktrace: event.error.stacktrace ?? '',
        level: event.error.level,
        server_version: event.error.server_version ?? '',
        server_software: event.error.server_software ?? '',
        plugin_version: event.error.plugin_version ?? '',
        timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
      },
    ],
    format: 'JSONEachRow',
  });
}
