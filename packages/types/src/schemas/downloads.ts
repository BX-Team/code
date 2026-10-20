import { z } from '@hono/zod-openapi';

export const ChannelSchema = z.enum(['alpha', 'beta', 'stable']);
export const SupportSchema = z.enum(['supported', 'deprecated', 'unsupported']);
export const ProjectKindSchema = z.enum(['versioned', 'release']);

/** A commit as the publishing workflow reports it; `at` is an ISO 8601 instant. */
export const PublishCommitSchema = z.object({
  sha: z.string().min(4).max(64),
  summary: z.string().max(500),
  at: z.iso.datetime({ offset: true }),
});

const publishFields = {
  channel: ChannelSchema.default('stable'),
  /** Revision the artifact was built from, when the publisher knows it. */
  commit: z.string().min(4).max(64).nullish(),
  commits: z.array(PublishCommitSchema).max(200).default([]),
  /** Key the file takes in `downloads`; a lone jar has always been `application`. */
  name: z
    .string()
    .regex(/^[a-z0-9._-]+$/i)
    .max(40)
    .default('application'),
};

/** Omitting `build` lets the server take the next number after the newest one. */
export const PublishBuildSchema = z.object({
  build: z.number().int().positive().optional(),
  ...publishFields,
});

export const PublishReleaseSchema = z.object({
  notes: z.string().max(20000).nullish(),
  ...publishFields,
});

export const VersionPatchSchema = z.object({
  support: SupportSchema.optional(),
  java_min: z.number().int().min(6).max(99).nullish(),
});

export const ProjectPatchSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  description: z.string().max(500).nullish(),
  repo: z.string().max(120).nullish(),
  /** The version `/downloads` opens on; `null` falls back to the newest one. */
  latest: z.string().max(60).nullish(),
  experimental: z.string().max(60).nullish(),
});

export const PageQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  after: z.coerce.number().int().positive().optional(),
});

const publishedFields = {
  event: z.literal('publish'),
  project: z.string(),
};

export const BuildPublishedSchema = z.object({
  ...publishedFields,
  kind: z.literal('build'),
  version: z.string(),
  build: z.number().int().positive(),
});

export const ReleasePublishedSchema = z.object({
  ...publishedFields,
  kind: z.literal('release'),
  tag: z.string(),
});

/**
 * What the API tells the bot after a publish. It carries the identity and nothing else —
 * the embed is rendered off a read-back, so a correction to the row shows up in Discord
 * without the notification having to grow a copy of it.
 */
export const PublishEventSchema = z.discriminatedUnion('kind', [BuildPublishedSchema, ReleasePublishedSchema]);

/** `url` points at the bucket, never at the API. */
export const DownloadSchema = z
  .object({
    name: z.string().openapi({ example: 'divinemc-26.2-11.jar' }),
    size: z.number().int(),
    sha256: z.string(),
    url: z.string().openapi({ format: 'uri' }),
  })
  .openapi('Download', { description: 'A published file. `url` points at the bucket, never at this API.' });

export const CommitSchema = z
  .object({
    sha: z.string(),
    summary: z.string(),
    at: z.string().openapi({ format: 'date-time' }),
  })
  .openapi('Commit');

export const ProjectSummarySchema = z
  .object({
    key: z.string().openapi({ example: 'divinemc' }),
    name: z.string().openapi({ example: 'DivineMC' }),
    kind: ProjectKindSchema,
    description: z.string().nullable(),
    /** The GitHub repository the project is built from, when it has one. */
    repo: z.string().nullable(),
    latest: z.string().nullable(),
    experimental: z.string().nullable(),
    updated_at: z.string().nullable().openapi({ format: 'date-time' }),
  })
  .openapi('ProjectSummary');

/** `kind` says which half is present; the other is absent rather than null. */
export const ProjectSchema = ProjectSummarySchema.extend({
  versions: z.array(z.string()).optional(),
  version_groups: z.record(z.string(), z.array(z.string())).optional(),
  releases: z.array(z.string()).optional(),
}).openapi('Project', { description: '`kind` says which half is present; the other is absent rather than null.' });

export const VersionSummarySchema = z
  .object({
    version: z.string().openapi({ example: '26.2' }),
    support: SupportSchema,
    java_min: z.number().int().nullable(),
    latest_build: z.number().int().nullable(),
    build_count: z.number().int(),
  })
  .openapi('VersionSummary');

export const BuildSchema = z
  .object({
    build: z.number().int(),
    project: z.string(),
    version: z.string(),
    channel: ChannelSchema,
    created_at: z.string().openapi({ format: 'date-time' }),
    commit: z.string().nullable(),
    commits: z.array(CommitSchema),
    downloads: z.record(z.string(), DownloadSchema),
  })
  .openapi('Build');

export const VersionSchema = VersionSummarySchema.extend({
  builds: z.object({ items: z.array(BuildSchema), next: z.string().nullable() }),
}).openapi('Version');

export const ReleaseSchema = z
  .object({
    tag: z.string(),
    project: z.string(),
    channel: ChannelSchema,
    created_at: z.string().openapi({ format: 'date-time' }),
    commit: z.string().nullable(),
    notes: z.string().nullable(),
    commits: z.array(CommitSchema),
    downloads: z.record(z.string(), DownloadSchema),
  })
  .openapi('Release');

export const NextBuildSchema = z.object({ project: z.string(), version: z.string(), next: z.number().int() });

export const OkSchema = z.object({ ok: z.boolean() }).openapi('Ok');

export const ErrorSchema = z.object({ ok: z.literal(false), error: z.string(), message: z.string() }).openapi('Error');

export type Channel = z.infer<typeof ChannelSchema>;
export type Support = z.infer<typeof SupportSchema>;
export type ProjectKind = z.infer<typeof ProjectKindSchema>;
export type PublishCommit = z.infer<typeof PublishCommitSchema>;
export type PublishBuild = z.infer<typeof PublishBuildSchema>;
export type PublishRelease = z.infer<typeof PublishReleaseSchema>;
export type VersionPatch = z.infer<typeof VersionPatchSchema>;
export type ProjectPatch = z.infer<typeof ProjectPatchSchema>;
export type PageQuery = z.infer<typeof PageQuerySchema>;
export type PublishEvent = z.infer<typeof PublishEventSchema>;
export type Download = z.infer<typeof DownloadSchema>;
export type Commit = z.infer<typeof CommitSchema>;
export type ProjectSummary = z.infer<typeof ProjectSummarySchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type VersionSummary = z.infer<typeof VersionSummarySchema>;
export type Version = z.infer<typeof VersionSchema>;
export type Build = z.infer<typeof BuildSchema>;
export type Release = z.infer<typeof ReleaseSchema>;
