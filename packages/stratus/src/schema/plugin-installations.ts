import { boolean, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { projects } from './projects';

export const pluginInstallations = pgTable('plugin_installations', {
  id: uuid('id').primaryKey().defaultRandom(),
  pluginId: uuid('plugin_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  serverId: uuid('server_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  version: text('version').notNull(),
  enabled: boolean('enabled').notNull().default(true),
  lastSeenAt: timestamp('last_seen_at').notNull().defaultNow(),
});
