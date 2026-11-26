import { zValidator } from '@hono/zod-validator';
import type { ValidationTargets } from 'hono';
import type { z } from 'zod';
import { badRequest } from './error';

/** A comma-separated list from a Worker variable, such as `TRUSTED_ORIGINS`. */
export function list(value: string): string[] {
  return value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

/** Parses one part of the request through `schema`; a failure is the shared 400, with Zod's first message. */
export function valid<Target extends keyof ValidationTargets, Schema extends z.ZodType>(
  target: Target,
  schema: Schema,
) {
  return zValidator(target, schema, result => {
    if (!result.success) throw badRequest(result.error.issues[0]?.message ?? `Invalid ${target}`);
  });
}
