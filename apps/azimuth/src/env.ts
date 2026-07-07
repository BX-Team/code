import type { D1Database, R2Bucket } from '@cloudflare/workers-types';

interface EmailAddress {
  email: string;
  name?: string;
}

export interface EmailSender {
  send(message: {
    from: string | EmailAddress;
    to: string | EmailAddress | (string | EmailAddress)[];
    subject: string;
    html?: string;
    text?: string;
    replyTo?: string | EmailAddress;
    cc?: string | EmailAddress | (string | EmailAddress)[];
    bcc?: string | EmailAddress | (string | EmailAddress)[];
    headers?: Record<string, string>;
  }): Promise<{ messageId: string }>;
}

export interface Env {
  AUTH_DB: D1Database;
  ATLAS_DB: D1Database;
  PULSIFY_DB: D1Database;
  ATLAS_BUCKET: R2Bucket;
  ERROR_PAYLOADS: R2Bucket;
  EMAIL: EmailSender;

  // Secrets via `wrangler secret put`; non-secret vars via wrangler.jsonc / .dev.vars.
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  TRUSTED_ORIGINS?: string;
  COOKIE_DOMAIN?: string;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  DISCORD_CLIENT_ID: string;
  DISCORD_CLIENT_SECRET: string;

  API_SECRET_KEY: string; // Bearer token for API requests
  R2_PUBLIC_URL: string;

  // AE_SQL_TOKEN is a Cloudflare API token with Account Analytics: Read.
  ACCOUNT_ID: string;
  AE_SQL_TOKEN: string;
}
