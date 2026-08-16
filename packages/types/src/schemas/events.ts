import { z } from 'zod';
import { ChannelSchema } from './atlas';

const ProjectSchema = z.object({
  key: z.string(),
  name: z.string(),
});

const buildFields = {
  project: ProjectSchema,
  version: z.string(),
  build: z.number(),
  channel: ChannelSchema,
  commits: z.array(
    z.object({
      sha: z.string(),
      message: z.string(),
      time: z.string(),
    }),
  ),
  download: z
    .object({
      fileName: z.string(),
      size: z.number(),
      url: z.string(),
    })
    .optional(),
};

export const BuildPublishedEventSchema = z.object({
  type: z.literal('build.published'),
  ...buildFields,
});

export const VersionReleasedEventSchema = z.object({
  type: z.literal('version.released'),
  ...buildFields,
  supportStatus: z.enum(['SUPPORTED', 'DEPRECATED', 'UNSUPPORTED']),
  javaMinVersion: z.number().nullable(),
});

export const AtlasEventSchema = z.discriminatedUnion('type', [VersionReleasedEventSchema, BuildPublishedEventSchema]);

export type AtlasEvent = z.infer<typeof AtlasEventSchema>;
export type VersionReleasedEvent = z.infer<typeof VersionReleasedEventSchema>;
export type BuildPublishedEvent = z.infer<typeof BuildPublishedEventSchema>;
