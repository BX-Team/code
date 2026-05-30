import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.string(),
  REDIS_URL: z.string(),
  CLICKHOUSE_URL: z.string(),
  APP_URL: z.string().default('https://pulsify.bx-team.com'),
});

export const env = schema.parse(process.env);
