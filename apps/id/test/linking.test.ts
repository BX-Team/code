import { env } from 'cloudflare:workers';
import { handleOAuthUserInfo } from 'better-auth/oauth2';
import { describe, expect, it } from 'vitest';
import { createAuth } from '../src/auth';
import { db } from '../src/db';

const ctx = { waitUntil() {}, passThroughOnException() {}, props: {} } as unknown as ExecutionContext;

async function context() {
  return { context: await createAuth(env, ctx).$context } as never;
}

function discord(email: string, emailVerified: boolean, id: string) {
  return {
    userInfo: { id, email, emailVerified, name: 'Someone' },
    account: { providerId: 'discord', accountId: id },
  };
}

describe('Discord and GitHub sign-in', () => {
  it('joins an existing BX ID only when the provider has verified the address', async () => {
    const auth = await createAuth(env, ctx).$context;
    // As a sign-in by email code leaves it: the address is proven.
    const owner = await auth.internalAdapter.createUser(
      { email: 'owner@example.test', emailVerified: true, name: 'Owner' },
      { method: 'email-otp' } as never,
    );

    const unverified = await handleOAuthUserInfo(await context(), discord('owner@example.test', false, 'attacker'));
    expect(unverified.data).toBeNull();
    expect(
      await db(env).selectFrom('account').select('id').where('accountId', '=', 'attacker').executeTakeFirst(),
    ).toBeUndefined();

    const verified = await handleOAuthUserInfo(await context(), discord('owner@example.test', true, 'owner-discord'));
    expect(verified.data?.user.id).toBe(owner.id);
  });

  it('makes no BX ID for an address the provider has not verified', async () => {
    await expect(handleOAuthUserInfo(await context(), discord('someone@example.test', false, 'new'))).rejects.toThrow(
      'Verify your email with the provider first',
    );
    const auth = await createAuth(env, ctx).$context;
    expect(await auth.internalAdapter.findUserByEmail('someone@example.test')).toBeNull();
  });
});
