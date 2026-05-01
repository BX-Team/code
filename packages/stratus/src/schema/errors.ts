import { integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { projects } from './projects';

export const errors = pgTable('errors', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  plugin: text('plugin').notNull(),
  message: text('message').notNull(),
  stacktrace: text('stacktrace').notNull(),
  level: text('level').notNull().default('error'),
  firstSeenAt: timestamp('first_seen_at').notNull().defaultNow(),
  lastSeenAt: timestamp('last_seen_at').notNull().defaultNow(),
  count: integer('count').notNull().default(1),
});
