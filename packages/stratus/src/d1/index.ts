import type { D1Database } from '@cloudflare/workers-types';
import { drizzle } from 'drizzle-orm/d1';
import * as atlasSchema from './atlas';

export * from './atlas';
export { atlasSchema };

/** Drizzle client bound to a Worker's `atlas-db` D1 binding. */
export function createAtlasDb(binding: D1Database) {
  return drizzle(binding, { schema: atlasSchema });
}

export type AtlasDb = ReturnType<typeof createAtlasDb>;
