import { forbidden, unauthorized } from '@bx-team/worker/error';
import { sha256Hex } from '@bx-team/worker/hex';
import { createMiddleware } from 'hono/factory';
import type { AppEnv } from '../context';
import { findToken, project, touchToken } from '../database/downloads';

// Stored only as a hash and bound to one project, so a leaked token can't publish into another's downloads.
export const requireToken = createMiddleware<AppEnv>(async (c, next) => {
  const header = c.req.header('Authorization') ?? '';
  if (!header.startsWith('Bearer ')) throw unauthorized();

  const token = await findToken(c.env.DB, await sha256Hex(header.slice('Bearer '.length).trim()));
  if (!token) throw unauthorized();

  const key = c.req.param('project');
  if (token.project !== key) throw forbidden(`This token cannot publish to '${key}'`);

  const row = await project(c.env.DB, token.project);
  if (!row) throw unauthorized();

  c.set('project', row);
  c.executionCtx.waitUntil(touchToken(c.env.DB, token.id));

  await next();
});
