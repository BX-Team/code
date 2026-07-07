import type { PulsifyDb } from '@bx-team/stratus/d1';
import type {
  AnalyticsEngineDataset,
  D1Database,
  DurableObjectNamespace,
  KVNamespace,
  R2Bucket,
} from '@cloudflare/workers-types';
import type { SessionBridge } from './lib/session';

export interface IngestMessage {
  event: unknown;
  projectId: string;
  receivedAt: number;
  ip: string | null;
}

export interface Env {
  PULSIFY_DB: D1Database;
  ERROR_PAYLOADS: R2Bucket;
  GEOIP_CACHE: KVNamespace;
  AE_EVENTS: AnalyticsEngineDataset;
  AE_SERVER_STATS: AnalyticsEngineDataset;
  AE_SESSIONS: AnalyticsEngineDataset;
  AE_ERRORS: AnalyticsEngineDataset;
  AE_CUSTOM_METRICS: AnalyticsEngineDataset;
  SESSION_BRIDGE: DurableObjectNamespace<SessionBridge>;
  ACCOUNT_ID: string;
  AE_SQL_TOKEN: string;
  IPINFO_TOKEN: string;
  APP_URL: string;
}

/** Shared per-batch context handed to message handlers. */
export interface HandlerContext {
  env: Env;
  db: PulsifyDb;
}
