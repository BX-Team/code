import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import { createAuth } from '../src/auth';
import { db } from '../src/db';
import worker from '../src/worker';

const ctx = { waitUntil() {}, passThroughOnException() {}, props: {} } as unknown as ExecutionContext;

async function user(email: string) {
  const auth = await createAuth(env, ctx).$context;
  return auth.internalAdapter.createUser({ email, emailVerified: true, name: email }, { method: 'email-otp' } as never);
}

async function session(userId: string, userAgent: string, clientId: string | null) {
  const token = crypto.randomUUID();
  const now = new Date().toISOString();
  await db(env)
    .insertInto('session')
    .values({
      id: crypto.randomUUID(),
      token,
      userId,
      userAgent,
      clientId,
      createdAt: now,
      updatedAt: now,
      expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    })
    .execute();
  return token;
}

describe('disconnecting Riven', () => {
  it("ends the launcher's sessions, old ones too, and its friends, but keeps the browser's", async () => {
    const me = await user('me@example.test');
    const friend = await user('friend@example.test');
    const browser = await session(me.id, 'Mozilla/5.0 Firefox/140.0', null);
    await session(me.id, 'Riven/1.4.0', 'riven');
    // Signed in before sessions kept their app: only the User-Agent tells.
    await session(me.id, 'Riven/1.2.0', null);
    await db(env)
      .insertInto('friendship')
      .values({ userId: me.id, friendId: friend.id, status: 'accepted', createdAt: new Date().toISOString() })
      .execute();
    await db(env)
      .insertInto('connectedApp')
      .values({ userId: me.id, clientId: 'riven', createdAt: new Date().toISOString() })
      .execute();

    const response = await worker.fetch(
      new Request('https://api.example.test/v1/auth/apps/riven', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${browser}` },
      }),
      env,
      ctx,
    );
    expect(response.status).toBe(204);

    const left = await db(env).selectFrom('session').select('token').where('userId', '=', me.id).execute();
    expect(left.map(s => s.token)).toEqual([browser]);
    expect(await db(env).selectFrom('friendship').selectAll().execute()).toEqual([]);
    expect(await db(env).selectFrom('connectedApp').selectAll().where('userId', '=', me.id).execute()).toEqual([]);
  });
});
