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

export const resolvedIssues = pgTable(
  'pulsify_resolved_issues',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    fingerprint: text('fingerprint').notNull(),
    resolvedAt: timestamp('resolved_at').notNull().defaultNow(),
    resolvedBy: text('resolved_by'),
  },
  t => [unique().on(t.projectId, t.fingerprint)],
);
