import { PictureChoiceSchema } from '@bx-team/types/schema/bxid';
import { badRequest, HttpError, notFound } from '@bx-team/worker/error';
import { Hono } from 'hono';
import { createAuth } from './auth';
import type { Env } from './env';
import { signedIn, type Vars } from './session';

/** Sets the account picture from a connected Discord or GitHub account, or clears it for the initial. */
export const picture = new Hono<{ Bindings: Env; Variables: Vars }>().use(signedIn).post('/', async c => {
  const body = PictureChoiceSchema.safeParse(await c.req.json().catch(() => null));
  if (!body.success) throw badRequest(body.error.message);
  const { source } = body.data;
  const auth = createAuth(c.env, c.executionCtx as never);
  const headers = c.req.raw.headers;

  let image: string | null = null;
  if (source !== 'initial') {
    const account = await c.env.DB.prepare(`select "id" from "account" where "userId" = ?1 and "providerId" = ?2`)
      .bind(c.get('userId'), source)
      .first<{ id: string }>();
    if (!account) throw notFound(`No ${source} account is connected`);
    // The provider is asked again: Better Auth keeps no picture per linked account, only the user's one.
    const tokens = await auth.api.getAccessToken({ body: { accountId: account.id }, headers });
    const provider = (await auth.$context).socialProviders.find(p => p.id === source);
    const info = await provider?.getUserInfo(tokens as never).catch(() => null);
    image = info?.user.image ?? null;
    if (!image) throw new HttpError(502, 'Bad Gateway', `${source} did not return a picture; sign in with it again`);
  }

  await auth.api.updateUser({ body: { image }, headers });
  return c.json({ image });
});
