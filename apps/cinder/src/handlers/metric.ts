import type { CustomMetric } from '@bx-team/types/schema/pulsify';
import { clickhouse } from '../lib/clickhouse';

export async function handleMetric(event: CustomMetric, projectId: string) {
  await clickhouse.insert({
    table: 'custom_metrics',
    values: [
      {
        project_id: projectId,
        name: event.name,
        value: event.value,
        labels: event.labels ?? {},
        timestamp: new Date(event.timestamp).toISOString().slice(0, 19).replace('T', ' '),
      },
    ],
    format: 'JSONEachRow',
  });
}
