import type { Env, IngestMessage } from '../env';

/** Cloudflare Queues caps a single sendBatch at 100 messages. */
const MAX_BATCH = 100;

/** Enqueues validated events onto `pulsify-ingest`, chunked to the sendBatch limit. */
export async function enqueueEvents(env: Env, messages: IngestMessage[]): Promise<void> {
  for (let i = 0; i < messages.length; i += MAX_BATCH) {
    const chunk = messages.slice(i, i + MAX_BATCH);
    await env.INGEST_QUEUE.sendBatch(chunk.map(body => ({ body })));
  }
}
