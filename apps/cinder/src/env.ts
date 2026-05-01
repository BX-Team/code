import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.string(),
  REDIS_URL: z.string(),
  CLICKHOUSE_URL: z.string(),
});

export const env = schema.parse(process.env);
