import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.string(),
  REDIS_URL: z.string(),
  PORT: z.coerce.number().default(3001),
});

export const env = schema.parse(process.env);
