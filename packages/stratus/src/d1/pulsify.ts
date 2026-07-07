import { sql } from 'drizzle-orm';
import { check, integer, primaryKey, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

const randomUuid = () => crypto.randomUUID();
const now = sql`(unixepoch())`;

export const projects = sqliteTable(
  'pulsify_projects',
  {
    id: text('id').primaryKey().$defaultFn(randomUuid),
    // Reference to auth-db users.id — plain TEXT, no cross-database FK.
    ownerId: text('owner_id').notNull(),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    type: text('type', { enum: ['server', 'plugin', 'mod'] }).notNull(),
    description: text('description'),
    verified: integer('verified', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(now),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(now),
  },
  t => [
    uniqueIndex('pulsify_plugin_name_unique').on(t.name).where(sql`${t.type} in ('plugin', 'mod')`),
    check('pulsify_projects_type_check', sql`${t.type} in ('server', 'plugin', 'mod')`),
  ],
);

export const dsnTokens = sqliteTable('pulsify_dsn_tokens', {
  id: text('id').primaryKey().$defaultFn(randomUuid),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  key: text('key').notNull().unique(),
  label: text('label'),
  revoked: integer('revoked', { mode: 'boolean' }).notNull().default(false),
  lastUsedAt: integer('last_used_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(now),
});

export const pluginInstallations = sqliteTable(
  'pulsify_plugin_installations',
  {
    id: text('id').primaryKey().$defaultFn(randomUuid),
    pluginId: text('plugin_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    serverId: text('server_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    version: text('version').notNull(),
    enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
    shareErrors: integer('share_errors', { mode: 'boolean' }).notNull().default(true),
    lastSeenAt: integer('last_seen_at', { mode: 'timestamp' }).notNull().default(now),
  },
  t => [uniqueIndex('pulsify_plugin_installations_plugin_server_unique').on(t.pluginId, t.serverId)],
);

export const serverMetadata = sqliteTable(
  'pulsify_server_metadata',
  {
    id: text('id').primaryKey().$defaultFn(randomUuid),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    lastSeenAt: integer('last_seen_at', { mode: 'timestamp' }).notNull().default(now),
    software: text('software'),
    mcVersion: text('mc_version'),
    countryCode: text('country_code'),
  },
  t => [uniqueIndex('pulsify_server_metadata_project_unique').on(t.projectId)],
);

export const quotas = sqliteTable('pulsify_quotas', {
  // Reference to auth-db users.id — plain TEXT, no cross-database FK.
  userId: text('user_id').primaryKey(),
  maxProjects: integer('max_projects').notNull().default(10),
  maxEventsPerDay: integer('max_events_per_day').notNull().default(100000),
  resetAt: integer('reset_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(now),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(now),
});

export const issues = sqliteTable(
  'pulsify_resolved_issues',
  {
    id: text('id').primaryKey().$defaultFn(randomUuid),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    fingerprint: text('fingerprint').notNull(),
    plugin: text('plugin').notNull().default(''),
    status: text('status', { enum: ['open', 'resolved', 'ignored', 'muted'] })
      .notNull()
      .default('open'),
    statusVersion: text('status_version'),
    mutedUntil: integer('muted_until', { mode: 'timestamp' }),
    firstVersion: text('first_version'),
    lastVersion: text('last_version'),
    firstSeenAt: integer('first_seen_at', { mode: 'timestamp' }).notNull().default(now),
    lastSeenAt: integer('last_seen_at', { mode: 'timestamp' }).notNull().default(now),
    resolvedAt: integer('resolved_at', { mode: 'timestamp' }),
    resolvedBy: text('resolved_by'),
  },
  t => [
    uniqueIndex('pulsify_resolved_issues_project_fingerprint_unique').on(t.projectId, t.fingerprint),
    check('pulsify_issue_status_check', sql`${t.status} in ('open', 'resolved', 'ignored', 'muted')`),
  ],
);

export const alertRules = sqliteTable(
  'pulsify_alert_rules',
  {
    id: text('id').primaryKey().$defaultFn(randomUuid),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    type: text('type', { enum: ['new_issue', 'regression', 'error_spike'] }).notNull(),
    enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
    threshold: integer('threshold').notNull().default(10),
    windowMinutes: integer('window_minutes').notNull().default(5),
    webhookUrl: text('webhook_url').notNull(),
    lastFiredAt: integer('last_fired_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(now),
  },
  t => [check('pulsify_alert_type_check', sql`${t.type} in ('new_issue', 'regression', 'error_spike')`)],
);

export const dailyUsage = sqliteTable(
  'pulsify_daily_usage',
  {
    token: text('token').notNull(),
    day: text('day').notNull(),
    count: integer('count').notNull().default(0),
  },
  t => [primaryKey({ columns: [t.token, t.day] })],
);
