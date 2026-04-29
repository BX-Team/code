import { integer, pgEnum, pgSchema, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const atlasSchema = pgSchema('atlas');

export const channelEnum = pgEnum('channel', ['ALPHA', 'BETA', 'STABLE']);

export const supportStatusEnum = pgEnum('support_status', ['SUPPORTED', 'DEPRECATED', 'UNSUPPORTED']);

export const projects = atlasSchema.table('projects', {
  id: serial('id').primaryKey(),
  key: text('key').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  latestVersion: text('latest_version'),
  experimentalVersion: text('experimental_version'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const versions = atlasSchema.table('versions', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  key: text('key').notNull(),
  supportStatus: supportStatusEnum('support_status').notNull().default('SUPPORTED'),
  javaMinVersion: integer('java_min_version'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const builds = atlasSchema.table('builds', {
  id: serial('id').primaryKey(),
  versionId: integer('version_id')
    .notNull()
    .references(() => versions.id, { onDelete: 'cascade' }),
  buildNumber: integer('build_number').notNull(),
  channel: channelEnum('channel').notNull().default('STABLE'),
  time: timestamp('time').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const commits = atlasSchema.table('commits', {
  id: serial('id').primaryKey(),
  buildId: integer('build_id')
    .notNull()
    .references(() => builds.id, { onDelete: 'cascade' }),
  sha: text('sha').notNull(),
  message: text('message').notNull(),
  time: timestamp('time').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const downloads = atlasSchema.table('downloads', {
  id: serial('id').primaryKey(),
  buildId: integer('build_id')
    .notNull()
    .references(() => builds.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  fileName: text('file_name').notNull(),
  filePath: text('file_path').notNull(),
  size: integer('size').notNull(),
  sha256: text('sha256').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
