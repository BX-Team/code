import type { AtlasEvent } from '@bx-team/types/schema/events';
import type { D1Database, Queue, R2Bucket } from '@cloudflare/workers-types';

export interface Env {
  ATLAS_DB: D1Database;
  ATLAS_BUCKET: R2Bucket;
  ATLAS_EVENTS: Queue<AtlasEvent>;

  /** Bearer token guarding the publish endpoints; set with `wrangler secret put`. */
  API_SECRET_KEY: string;
  /** Public origin the ATLAS_BUCKET is served from, used to build download URLs. */
  R2_PUBLIC_URL: string;
}
