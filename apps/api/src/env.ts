import type { D1Database, R2Bucket } from '@cloudflare/workers-types';

export interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;

  /** Public origin the BUCKET is served from; every download URL is built off it. */
  R2_PUBLIC_URL: string;
  /** Where a publish is announced. Empty leaves the publish silent rather than failing. */
  BOT_WEBHOOK_URL: string;
  /** Keys the `X-Api-Signature` HMAC the bot verifies. */
  BOT_WEBHOOK_SECRET: string;
}
