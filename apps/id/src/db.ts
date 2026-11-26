import { database } from '@bx-team/worker/db';
import type { Kysely } from 'kysely';
import type { Tables } from './tables';

export type DB = Kysely<Tables>;

export const db = (env: Env): DB => database<Tables>(env.DB);
