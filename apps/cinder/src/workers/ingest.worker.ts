import { IngestBatchSchema } from '@bx-team/types/schema/pulsify';
import { Worker } from 'bullmq';
import { handleErrorEvent } from '../handlers/error-event';
import { handleHeartbeat } from '../handlers/heartbeat';
import { handleMetric } from '../handlers/metric';
import { handlePlayerEvent } from '../handlers/player-event';
import { clickhouse } from '../lib/clickhouse';
import { lookupCountry } from '../lib/geoip';
import { redis } from '../lib/redis';

export interface IngestJobData {
  event: unknown;
  projectId: string;
  receivedAt: string;
  ip: string | null;
}

export function createIngestWorker() {
  const worker = new Worker<IngestJobData>(
    'ingest-queue',
    async job => {
      const { event, projectId, ip } = job.data;

      const parsed = IngestBatchSchema.element.safeParse(event);
      if (!parsed.success) return;

      const e = parsed.data;
      const countryCode = lookupCountry(ip);
      const ts = new Date(e.timestamp).toISOString().slice(0, 19).replace('T', ' ');

      await Promise.all([
        // Route by type
        (async () => {
          if (e.type === 'heartbeat') return handleHeartbeat(e, projectId, countryCode);
          if (e.type === 'event') return handlePlayerEvent(e, projectId, countryCode);
          if (e.type === 'error') return handleErrorEvent(e, projectId);
          if (e.type === 'metric') return handleMetric(e, projectId);
        })(),

        // Always write raw event to ClickHouse
        clickhouse.insert({
          table: 'events',
          values: [
            {
              project_id: projectId,
              event_type: e.type,
              timestamp: ts,
              properties: JSON.stringify(e),
            },
          ],
          format: 'JSONEachRow',
        }),
      ]);
    },
    { connection: redis },
  );

  worker.on('failed', (job, err) => {
    const cause = (err as { cause?: unknown }).cause;
    const causeMsg = cause instanceof Error ? ` — Caused by: ${cause.message}` : '';
    console.error(`Job ${job?.id} failed:`, err.message + causeMsg);
  });

  return worker;
}
