import { z } from 'zod';

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
 * What azimuth tells beacon after a publish. It carries the identity and nothing else —
 * the embed is rendered off a read-back, so a correction to the row shows up in Discord
 * without the notification having to grow a copy of it.
 */
export const PublishEventSchema = z.discriminatedUnion('kind', [BuildPublishedSchema, ReleasePublishedSchema]);

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
