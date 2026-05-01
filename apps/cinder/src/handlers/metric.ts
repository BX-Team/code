import type { CustomMetric } from '@bx-team/types/schema/pulsify';
import { clickhouse } from '../lib/clickhouse';

export async function handleMetric(event: CustomMetric, projectId: string) {
  await clickhouse.insert({
    table: 'events',
    values: [
      {
        project_id: projectId,
        event_type: 'metric',
        timestamp: new Date(event.timestamp).toISOString().replace('T', ' ').replace('Z', ''),
        properties: JSON.stringify({ name: event.name, value: event.value, labels: event.labels }),
      },
    ],
    format: 'JSONEachRow',
  });
}
