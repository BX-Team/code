import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import { createAuth } from '../src/auth';
import { db } from '../src/db';
import worker from '../src/worker';

const ctx = { waitUntil() {}, passThroughOnException() {}, props: {} } as unknown as ExecutionContext;

describe('device sign-in', () => {
  it('shows the approver where the code was asked for', async () => {
    const asked = await worker.fetch(
      new Request('https://api.example.test/v1/auth/device/code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'Riven/1.5.0', 'cf-connecting-ip': '203.0.113.7' },
        body: JSON.stringify({ client_id: 'riven' }),
        cf: { city: 'Stockholm', country: 'SE' },
      } as RequestInit),
      env,
      ctx,
    );
    expect(asked.status).toBe(200);
    const { user_code } = (await asked.json()) as { user_code: string };

    const auth = await createAuth(env, ctx).$context;
    const me = await auth.internalAdapter.createUser(
      { email: 'approver@example.test', emailVerified: true, name: 'Approver' },
      { method: 'email-otp' } as never,
    );
    const token = crypto.randomUUID();
    const now = new Date().toISOString();
    await db(env)
      .insertInto('session')
      .values({
        id: crypto.randomUUID(),
        token,
        userId: me.id,
        createdAt: now,
        updatedAt: now,
        expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      })
      .execute();
    const headers = { Authorization: `Bearer ${token}` };

    const claimed = await worker.fetch(
      new Request(`https://api.example.test/v1/auth/device?user_code=${user_code}`, { headers }),
      env,
      ctx,
    );
    expect(claimed.status).toBe(200);
    const origin = await worker.fetch(
      new Request(`https://api.example.test/v1/auth/device-origin?user_code=${user_code}`, { headers }),
      env,
      ctx,
    );
    expect(await origin.json()).toMatchObject({
      request: { city: 'Stockholm', country: 'SE', ipAddress: '203.0.113.7' },
    });
  });
});
