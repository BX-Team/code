import { boolean, integer, pgEnum, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { user } from './users';

export const projectTypeEnum = pgEnum('pulsify_project_type', ['server', 'plugin', 'mod']);

export const projects = pgTable('pulsify_projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: text('owner_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  type: projectTypeEnum('type').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const dsnTokens = pgTable('pulsify_dsn_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  key: text('key').notNull().unique(),
  label: text('label'),
  revoked: boolean('revoked').notNull().default(false),
  lastUsedAt: timestamp('last_used_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const errors = pgTable(
  'pulsify_errors',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    plugin: text('plugin').notNull(),
    message: text('message').notNull(),
    stacktrace: text('stacktrace').notNull(),
    level: text('level').notNull().default('error'),
    hash: text('hash').notNull(),
    firstSeenAt: timestamp('first_seen_at').notNull().defaultNow(),
    lastSeenAt: timestamp('last_seen_at').notNull().defaultNow(),
    count: integer('count').notNull().default(1),
  },
  t => [unique().on(t.projectId, t.hash)],
);

export const pluginInstallations = pgTable(
  'pulsify_plugin_installations',
  {
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
  },
  t => [unique().on(t.pluginId, t.serverId)],
);

export const serverMetadata = pgTable(
  'pulsify_server_metadata',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    lastSeenAt: timestamp('last_seen_at').notNull().defaultNow(),
    software: text('software'),
    mcVersion: text('mc_version'),
    countryCode: text('country_code'),
  },
  t => [unique().on(t.projectId)],
);
