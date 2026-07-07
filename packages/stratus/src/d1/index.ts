import type { D1Database } from '@cloudflare/workers-types';
import { drizzle } from 'drizzle-orm/d1';
import * as atlasSchema from './atlas';
import * as authSchema from './auth';
import * as pulsify from './pulsify';

export * from './atlas';
export * from './auth';
export * from './pulsify';
export { atlasSchema, authSchema, pulsify as pulsifySchema };

/** Drizzle client bound to a Worker's `pulsify-db` D1 binding. */
export function createPulsifyDb(binding: D1Database) {
  return drizzle(binding, { schema: pulsify });
}

/** Drizzle client bound to a Worker's `auth-db` D1 binding. */
export function createAuthDb(binding: D1Database) {
  return drizzle(binding, { schema: authSchema });
}

/** Drizzle client bound to a Worker's `atlas-db` D1 binding. */
export function createAtlasDb(binding: D1Database) {
  return drizzle(binding, { schema: atlasSchema });
}

export type PulsifyDb = ReturnType<typeof createPulsifyDb>;
export type AuthDb = ReturnType<typeof createAuthDb>;
export type AtlasDb = ReturnType<typeof createAtlasDb>;
