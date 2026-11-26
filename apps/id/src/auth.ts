import { products } from '@bx-team/worker/bxid';
import { isOn, limit, type Switch } from '@bx-team/worker/flags';
import { list } from '@bx-team/worker/http';
import { betterAuth } from 'better-auth';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { bearer } from 'better-auth/plugins/bearer';
import { captcha } from 'better-auth/plugins/captcha';
import { deviceAuthorization } from 'better-auth/plugins/device-authorization';
import { emailOTP } from 'better-auth/plugins/email-otp';
import { username } from 'better-auth/plugins/username';
import { db } from './db';
import { type Happened, origin, record, rememberApp } from './events';
import { freshFriendCode } from './friend-code';
import { sendCode } from './mail';
import { freshUsername } from './username';

export const BASE_PATH = '/v1/auth';

const DEVICE_CLIENTS = new Set(['riven']);

const SOCIAL = new Set(['discord', 'github']);

const PROVIDER_SWITCH: Record<string, Switch> = { discord: 'discord-sign-in', github: 'github-sign-in' };

/** Social sign-in starts at the first two and finishes at the callback, `/callback/:id`. */
const SOCIAL_PATHS = new Set(['/sign-in/social', '/link-social', '/callback/:id']);

/** Paths where the player ends another device's session, as opposed to signing this one out. */
const REVOKES = new Set(['/revoke-session', '/revoke-sessions', '/revoke-other-sessions']);

type HookContext = { path?: string; headers?: Headers; request?: Request; context?: { session?: unknown } } | null;

function from(hook: HookContext) {
  return origin(hook?.headers ?? hook?.request?.headers);
}

function pictureSource(image: string | null | undefined): string | null {
  if (!image) return null;
  const host = URL.parse(image)?.hostname ?? '';
  return host.endsWith('discordapp.com') ? 'discord' : host.endsWith('githubusercontent.com') ? 'github' : 'other';
}

export function createAuth(env: Env, ctx: ExecutionContext) {
  let signedUp = false;
  let profileChanges: Happened[] = [];

  return betterAuth({
    appName: 'BX ID',
    baseURL: env.BASE_URL,
    basePath: BASE_PATH,
    secret: env.BETTER_AUTH_SECRET,
    database: env.DB,
    trustedOrigins: list(env.TRUSTED_ORIGINS),
    disabledPaths: ['/sign-in/username'],
    socialProviders: {
      discord: {
        clientId: env.DISCORD_CLIENT_ID,
        clientSecret: env.DISCORD_CLIENT_SECRET,
        mapProfileToUser: profile => ({ username: profile.username }),
      },
      github: {
        clientId: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
        mapProfileToUser: profile => ({ username: profile.login }),
      },
    },
    user: {
      additionalFields: {
        friendCode: { type: 'string', required: false, input: false },
      },
      deleteUser: {
        enabled: true,
        afterDelete: async user => {
          ctx.waitUntil(Promise.all(products(env).map(product => product.forget(user.id))));
        },
      },
    },
    hooks: {
      before: createAuthMiddleware(async hook => {
        if (hook.path === '/email-otp/send-verification-otp' && !(await isOn(env.FLAGS, 'email-otp')))
          throw new APIError('SERVICE_UNAVAILABLE', {
            message: 'Sign-in by email is off for now; use Discord or GitHub',
          });
        if (!SOCIAL_PATHS.has(hook.path)) return;
        const provider =
          hook.path === '/callback/:id' ? hook.params?.id : (hook.body as { provider?: unknown })?.provider;
        const key = typeof provider === 'string' ? PROVIDER_SWITCH[provider] : undefined;
        if (key && !(await isOn(env.FLAGS, key)))
          throw new APIError('SERVICE_UNAVAILABLE', { message: `Sign-in with ${provider} is off for now` });
      }),
      after: createAuthMiddleware(async hook => {
        if (hook.path !== '/device/token') return;
        const userId = hook.context.newSession?.user.id;
        const clientId = (hook.body as { client_id?: unknown } | undefined)?.client_id;
        if (userId && typeof clientId === 'string') await rememberApp(env, userId, clientId, from(hook));
      }),
    },
    databaseHooks: {
      user: {
        create: {
          before: async user => {
            if (!(await isOn(env.FLAGS, 'sign-up')))
              throw new APIError('FORBIDDEN', { message: 'New BX IDs cannot be made right now; try again later' });
            if (!user.emailVerified)
              throw new APIError('FORBIDDEN', { message: 'Verify your email with the provider first' });
            const handle = (user as { username?: string | null }).username;
            const local = user.email.split('@')[0];
            const names = await freshUsername(db(env), [handle, user.name, local]);
            return { data: { ...user, ...names, friendCode: await freshFriendCode(db(env)) } };
          },
          after: async (user, hook) => {
            signedUp = true;
            await record(env, user.id, { kind: 'created', ...from(hook) });
          },
        },
        update: {
          before: async (data, hook) => {
            const userId = (hook?.context?.session as { user?: { id?: string } } | null | undefined)?.user?.id;
            if (!userId) return;
            const old = await db(env)
              .selectFrom('user')
              .select(['name', 'username', 'displayUsername', 'image'])
              .where('id', '=', userId)
              .executeTakeFirst();
            if (!old) return;
            const changes: Happened[] = [];
            if (data.name !== undefined && data.name !== old.name)
              changes.push({ kind: 'name', detail: { from: old.name || null, to: data.name || null } });
            const was = old.displayUsername ?? old.username;
            const now = (data.displayUsername ?? data.username) as string | undefined;
            if (now !== undefined && now !== was) changes.push({ kind: 'username', detail: { from: was, to: now } });
            if (data.image !== undefined && data.image !== old.image)
              changes.push({ kind: 'picture', detail: { source: pictureSource(data.image as string | null) } });
            profileChanges = changes;
          },
          after: async (user, hook) => {
            const changes = profileChanges;
            profileChanges = [];
            for (const change of changes) await record(env, user.id, { ...change, ...from(hook) });
          },
        },
      },
      session: {
        create: {
          after: async session => {
            await record(env, session.userId, {
              kind: 'signed-in',
              ipAddress: session.ipAddress,
              userAgent: session.userAgent,
            });
          },
        },
        delete: {
          // Expired sessions are deleted too, on a later look-up; only a player's own action is logged.
          after: async (session, hook) => {
            const kind =
              hook?.path === '/sign-out' ? 'signed-out' : REVOKES.has(hook?.path ?? '') ? 'device-removed' : null;
            if (!kind) return;
            await record(env, session.userId, {
              kind,
              ipAddress: session.ipAddress,
              userAgent: session.userAgent,
            });
          },
        },
      },
      account: {
        create: {
          after: async (account, hook) => {
            // Signing up with Discord or GitHub makes the account too; that is the "created" event.
            if (signedUp || !SOCIAL.has(account.providerId)) return;
            await record(env, account.userId, {
              kind: 'linked',
              detail: { provider: account.providerId },
              ...from(hook),
            });
          },
        },
        delete: {
          after: async (account, hook) => {
            if (hook?.path !== '/unlink-account' || !SOCIAL.has(account.providerId)) return;
            await record(env, account.userId, {
              kind: 'unlinked',
              detail: { provider: account.providerId },
              ...from(hook),
            });
          },
        },
      },
    },
    account: {
      accountLinking: { enabled: true },
    },
    rateLimit: {
      enabled: true,
      storage: 'database',
      customRules: {
        '/email-otp/send-verification-otp': async () => ({
          window: 60,
          max: await limit(env.FLAGS, 'otp-sends-per-minute'),
        }),
        '/sign-in/email-otp': async () => ({ window: 60, max: await limit(env.FLAGS, 'otp-tries-per-minute') }),
      },
    },
    advanced: {
      ipAddress: { ipAddressHeaders: ['cf-connecting-ip'] },
    },
    plugins: [
      emailOTP({
        expiresIn: 300,
        storeOTP: 'hashed',
        sendVerificationOTP: async ({ email, otp }) => {
          if (new URL(env.BASE_URL).hostname === 'localhost') console.log(`BX ID code for ${email}: ${otp}`);
          // `.test` is reserved (RFC 2606) and never receives mail.
          if (email.endsWith('.test')) return;
          // Answering before the mail is out keeps the response time from telling which addresses exist.
          ctx.waitUntil(sendCode(env, email, otp));
        },
      }),
      username(),
      bearer(),
      deviceAuthorization({
        verificationUri: `${env.SITE_URL}/account/device`,
        validateClient: clientId => DEVICE_CLIENTS.has(clientId),
      }),
      captcha({
        provider: 'cloudflare-turnstile',
        secretKey: env.TURNSTILE_SECRET_KEY,
        endpoints: ['/email-otp/send-verification-otp'],
      }),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;
