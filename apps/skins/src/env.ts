import type { D1Database, R2Bucket, Service } from '@cloudflare/workers-types';
import type { IdService } from '../../id/src/service';

export interface Env {
  DB: D1Database;
  TEXTURES: R2Bucket;
  ID: Service<IdService>;

  BASE_URL: string;
  TRUSTED_ORIGINS: string;
}
