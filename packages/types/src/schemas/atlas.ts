import { z } from 'zod';

export const ChannelSchema = z.enum(['ALPHA', 'BETA', 'STABLE']);

export const CreateVersionBodySchema = z.object({
  key: z.string(),
  supportStatus: z.enum(['SUPPORTED', 'DEPRECATED', 'UNSUPPORTED']).optional(),
  javaMinVersion: z.number().optional(),
});

export const BuildsQuerySchema = z.object({
  channel: ChannelSchema.optional(),
});

export const UploadMetadataSchema = z.object({
  buildNumber: z.number().optional(),
  channel: ChannelSchema.optional(),
  commits: z
    .array(
      z.object({
        sha: z.string(),
        message: z.string(),
        time: z.string(),
      }),
    )
    .optional(),
});
