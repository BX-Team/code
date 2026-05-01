import { db, dsnTokens } from '@bx-team/stratus';
import { and, eq } from 'drizzle-orm';
import { bearerAuth } from 'hono/bearer-auth';
import { createMiddleware } from 'hono/factory';
import { redis } from '../lib/redis';

export type AuthVariables = {
  projectId: string;
  tokenId: string;
};

const rateLimitMiddleware = createMiddleware(async (c, next) => {
  const token = c.req.header('authorization')?.replace(/^Bearer\s+/i, '');
  if (token) {
    const key = `ratelimit:${token}`;
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, 60);
    if (count > 100) return c.json({ error: 'Rate limit exceeded' }, 429);
  }
  await next();
});

const bearerMiddleware = bearerAuth({
  verifyToken: async (token, c) => {
    const record = await db.query.dsnTokens.findFirst({
      where: and(eq(dsnTokens.key, token), eq(dsnTokens.revoked, false)),
      columns: { id: true, projectId: true },
    });

    if (!record) return false;

    if (record.projectId !== c.req.param('projectId')) return false;

    db.update(dsnTokens)
      .set({ lastUsedAt: new Date() })
      .where(eq(dsnTokens.id, record.id))
      .catch(() => {});

    c.set('projectId', record.projectId);
    c.set('tokenId', record.id);

    return true;
  },
});

export const authMiddleware = [rateLimitMiddleware, bearerMiddleware] as const;
