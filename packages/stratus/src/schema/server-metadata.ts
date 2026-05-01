import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { projects } from './projects';

export const serverMetadata = pgTable('server_metadata', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  lastSeenAt: timestamp('last_seen_at').notNull().defaultNow(),
  software: text('software'),
  mcVersion: text('mc_version'),
  countryCode: text('country_code'),
});
