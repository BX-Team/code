import {
  account,
  createAuthDb,
  createPulsifyDb,
  projects,
  quotas,
  session,
  user,
  verification,
} from '@bx-team/stratus/d1';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin, magicLink } from 'better-auth/plugins';
import { eq } from 'drizzle-orm';
import type { Env } from '../env';
import { sendMagicLinkEmail } from './email';

/**
 * Builds the Better Auth instance for a single request. D1 (and secret) bindings are only
 * available per-request on Workers, so the instance is constructed here rather than at module
 * load — the recommended Hono-on-Cloudflare pattern.
 */
export function buildAuth(env: Env) {
  const db = createAuthDb(env.AUTH_DB);

  return betterAuth({
    baseURL: env.BETTER_AUTH_URL,
    // Auth lives at /auth, not the Better Auth default /api/auth — OAuth callback
    // URLs registered with the providers must point at /auth/callback/<provider>.
    basePath: '/auth',
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins:
      env.TRUSTED_ORIGINS?.split(',')
        .map(origin => origin.trim())
        .filter(Boolean) ?? [],
    database: drizzleAdapter(db, {
      provider: 'sqlite',
      schema: { user, session, account, verification },
    }),
    emailAndPassword: {
      enabled: false,
    },
    user: {
      deleteUser: {
        enabled: true,
        // No cross-database cascade into pulsify-db, so the user's Pulsify footprint is
        // removed explicitly; intra-database FKs cascade the rest.
        afterDelete: async deletedUser => {
          const pulsifyDb = createPulsifyDb(env.PULSIFY_DB);
          await pulsifyDb.delete(projects).where(eq(projects.ownerId, deletedUser.id));
          await pulsifyDb.delete(quotas).where(eq(quotas.userId, deletedUser.id));
        },
      },
    },
    plugins: [
      admin(),
      magicLink({
        sendMagicLink: async ({ email, url }) => {
          await sendMagicLinkEmail(env.EMAIL, email, url);
        },
      }),
    ],
    socialProviders: {
      github: {
        clientId: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
      },
      discord: {
        clientId: env.DISCORD_CLIENT_ID,
        clientSecret: env.DISCORD_CLIENT_SECRET,
      },
    },
    advanced: env.COOKIE_DOMAIN ? { crossSubDomainCookies: { enabled: true, domain: env.COOKIE_DOMAIN } } : undefined,
  });
}

export type Auth = ReturnType<typeof buildAuth>;
export type AuthSession = Awaited<ReturnType<Auth['api']['getSession']>>;
