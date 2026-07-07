import { sql } from 'drizzle-orm';
import { check, index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

const now = sql`(unixepoch())`;

export const atlasProjects = sqliteTable('atlas_projects', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  key: text('key').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  latestVersion: text('latest_version'),
  experimentalVersion: text('experimental_version'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(now),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(now),
});

export const versions = sqliteTable(
  'atlas_versions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    projectId: integer('project_id')
      .notNull()
      .references(() => atlasProjects.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    supportStatus: text('support_status', { enum: ['SUPPORTED', 'DEPRECATED', 'UNSUPPORTED'] })
      .notNull()
      .default('SUPPORTED'),
    javaMinVersion: integer('java_min_version'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(now),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(now),
  },
  t => [
    index('atlas_versions_project_key_idx').on(t.projectId, t.key),
    check('atlas_versions_support_status_check', sql`${t.supportStatus} in ('SUPPORTED', 'DEPRECATED', 'UNSUPPORTED')`),
  ],
);

export const builds = sqliteTable(
  'atlas_builds',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    versionId: integer('version_id')
      .notNull()
      .references(() => versions.id, { onDelete: 'cascade' }),
    buildNumber: integer('build_number').notNull(),
    channel: text('channel', { enum: ['ALPHA', 'BETA', 'STABLE'] })
      .notNull()
      .default('STABLE'),
    time: integer('time', { mode: 'timestamp' }).notNull().default(now),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(now),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(now),
  },
  t => [
    index('atlas_builds_version_build_number_idx').on(t.versionId, t.buildNumber),
    check('atlas_builds_channel_check', sql`${t.channel} in ('ALPHA', 'BETA', 'STABLE')`),
  ],
);

export const commits = sqliteTable(
  'atlas_commits',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    buildId: integer('build_id')
      .notNull()
      .references(() => builds.id, { onDelete: 'cascade' }),
    sha: text('sha').notNull(),
    message: text('message').notNull(),
    time: integer('time', { mode: 'timestamp' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(now),
  },
  t => [index('atlas_commits_build_idx').on(t.buildId)],
);

export const downloads = sqliteTable(
  'atlas_downloads',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    buildId: integer('build_id')
      .notNull()
      .references(() => builds.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    fileName: text('file_name').notNull(),
    filePath: text('file_path').notNull(),
    size: integer('size').notNull(),
    sha256: text('sha256').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(now),
  },
  t => [index('atlas_downloads_build_idx').on(t.buildId)],
);
