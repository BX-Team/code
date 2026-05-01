import { z } from 'zod';

export const HeartbeatSchema = z.object({
  type: z.literal('heartbeat'),
  timestamp: z.number(),
  server: z.object({
    online: z.number(),
    max: z.number(),
    tps: z.number(),
    mspt: z.number(),
    memory_used_mb: z.number(),
    memory_max_mb: z.number(),
    version: z.string(),
    software: z.string(),
  }),
  plugins: z.array(
    z.object({
      name: z.string(),
      version: z.string(),
      enabled: z.boolean(),
    }),
  ),
});

export const PlayerEventSchema = z.object({
  type: z.literal('event'),
  timestamp: z.number(),
  event: z.enum(['player_join', 'player_quit']),
  payload: z.object({
    player_uuid: z.string().uuid(),
    client_version: z.string(),
    ip_hash: z.string().optional(),
  }),
});

export const ErrorEventSchema = z.object({
  type: z.literal('error'),
  timestamp: z.number(),
  plugin: z.string(),
  error: z.object({
    message: z.string(),
    stacktrace: z.string(),
    level: z.enum(['warning', 'error', 'fatal']).default('error'),
  }),
});

export const CustomMetricSchema = z.object({
  type: z.literal('metric'),
  timestamp: z.number(),
  name: z.string(),
  value: z.number(),
  labels: z.record(z.string(), z.string()).optional(),
});

export const IngestBatchSchema = z.array(
  z.discriminatedUnion('type', [HeartbeatSchema, PlayerEventSchema, ErrorEventSchema, CustomMetricSchema]),
);

export type Heartbeat = z.infer<typeof HeartbeatSchema>;
export type PlayerEvent = z.infer<typeof PlayerEventSchema>;
export type ErrorEvent = z.infer<typeof ErrorEventSchema>;
export type CustomMetric = z.infer<typeof CustomMetricSchema>;
export type IngestBatch = z.infer<typeof IngestBatchSchema>;
