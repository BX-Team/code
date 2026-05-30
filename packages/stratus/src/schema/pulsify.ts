import { sql } from 'drizzle-orm';
import { boolean, integer, pgEnum, pgTable, text, timestamp, unique, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { user } from './users';

export const projectTypeEnum = pgEnum('pulsify_project_type', ['server', 'plugin', 'mod']);

export const projects = pgTable(
  'pulsify_projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    type: projectTypeEnum('type').notNull(),
    description: text('description'),
    verified: boolean('verified').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  t => [uniqueIndex('pulsify_plugin_name_unique').on(t.name).where(sql`${t.type} in ('plugin', 'mod')`)],
);

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
    shareErrors: boolean('share_errors').notNull().default(true),
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

export const quotas = pgTable('pulsify_quotas', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  maxProjects: integer('max_projects').notNull().default(10),
  maxEventsPerDay: integer('max_events_per_day').notNull().default(100000),
  resetAt: timestamp('reset_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const issueStatusEnum = pgEnum('pulsify_issue_status', ['open', 'resolved', 'ignored', 'muted']);

/**
 * Canonical per-project issue registry — one row per error fingerprint. ClickHouse keeps the
 * raw events (counts, timelines, version breakdowns); this table holds lifecycle state and
 * version provenance, maintained at ingest by cinder. The physical table name is kept as the
 * original `pulsify_resolved_issues` so the schema grows by pure column additions instead of
 * a table rename.
 */
export const issues = pgTable(
  'pulsify_resolved_issues',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    fingerprint: text('fingerprint').notNull(),
    plugin: text('plugin').notNull().default(''),
    status: issueStatusEnum('status').notNull().default('open'),
    // Plugin version recorded when the status last changed — regression detection reopens a
    // resolved issue only when it recurs on a *newer* version than the one it was fixed in.
    statusVersion: text('status_version'),
    mutedUntil: timestamp('muted_until'),
    firstVersion: text('first_version'),
    lastVersion: text('last_version'),
    firstSeenAt: timestamp('first_seen_at').notNull().defaultNow(),
    lastSeenAt: timestamp('last_seen_at').notNull().defaultNow(),
    resolvedAt: timestamp('resolved_at'),
    resolvedBy: text('resolved_by'),
  },
  t => [unique().on(t.projectId, t.fingerprint)],
);

export const alertTypeEnum = pgEnum('pulsify_alert_type', ['new_issue', 'regression', 'error_spike']);

/**
 * Notification rules evaluated against incoming errors. `new_issue` and `regression` fire at
 * ingest (cinder issue registry transitions); `error_spike` is evaluated periodically against
 * ClickHouse — `threshold` events within `windowMinutes`. Delivery is a generic webhook POST,
 * Discord-formatted automatically when the URL is a Discord webhook.
 */
export const alertRules = pgTable('pulsify_alert_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  type: alertTypeEnum('type').notNull(),
  enabled: boolean('enabled').notNull().default(true),
  threshold: integer('threshold').notNull().default(10),
  windowMinutes: integer('window_minutes').notNull().default(5),
  webhookUrl: text('webhook_url').notNull(),
  lastFiredAt: timestamp('last_fired_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
