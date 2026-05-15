import { account, db, session, user, verification } from '@bx-team/stratus';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin, magicLink } from 'better-auth/plugins';
import { Resend } from 'resend';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: user,
      session: session,
      account: account,
      verification: verification,
    },
  }),
  emailAndPassword: {
    enabled: false,
  },
  user: {
    deleteUser: {
      enabled: true,
    },
  },
  plugins: [
    admin(),
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: 'BX Team <account@bxteam.org>',
          to: email,
          template: {
            id: process.env.RESEND_MAGIC_LINK_TEMPLATE_ID as string,
            variables: {
              magic_link: url,
              email,
            },
          },
        });
      },
    }),
  ],
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
    },
    discord: {
      clientId: process.env.DISCORD_CLIENT_ID as string,
      clientSecret: process.env.DISCORD_CLIENT_SECRET as string,
    },
  },
});
