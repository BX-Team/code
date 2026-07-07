import type { CustomMetric } from '@bx-team/types/schema/pulsify';
import type { Env } from '../env';
import { writeMetric } from '../lib/analytics';

export function handleMetric(env: Env, event: CustomMetric, projectId: string) {
  writeMetric(env, projectId, {
    name: event.name,
    value: event.value,
    labels: event.labels ?? {},
  });
}
