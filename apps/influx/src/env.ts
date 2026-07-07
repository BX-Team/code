import type { D1Database, Queue } from '@cloudflare/workers-types';

export interface IngestMessage {
  event: unknown;
  projectId: string;
  receivedAt: number;
  ip: string | null;
}

/** Workers native Rate Limiting binding. */
export interface RateLimit {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

export interface Env {
  PULSIFY_DB: D1Database;
  INGEST_QUEUE: Queue<IngestMessage>;
  RATE_LIMITER: RateLimit;
}
