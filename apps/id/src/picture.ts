import { PictureChoiceSchema } from '@bx-team/types/schema/bxid';
import { HttpError, notFound } from '@bx-team/worker/error';
import { valid } from '@bx-team/worker/http';
import { Hono } from 'hono';
import { createAuth } from './auth';
import { db } from './db';
import { type Bindings, signedIn } from './session';

/** Sets the account picture from a connected Discord or GitHub account, or clears it for the initial. */
export const picture = new Hono<Bindings>().use(signedIn).post('/', valid('json', PictureChoiceSchema), async c => {
  const { source } = c.req.valid('json');
  const auth = createAuth(c.env, c.executionCtx as never);
  const headers = c.req.raw.headers;

  let image: string | null = null;
  if (source !== 'initial') {
    const account = await db(c.env)
      .selectFrom('account')
      .select('id')
      .where('userId', '=', c.get('userId'))
      .where('providerId', '=', source)
      .executeTakeFirst();
    if (!account) throw notFound(`No ${source} account is connected`, 'PICTURE_NOT_CONNECTED', { provider: source });
    // The provider is asked again: Better Auth keeps no picture per linked account, only the user's one.
    const tokens = await auth.api.getAccessToken({ body: { accountId: account.id }, headers });
    const provider = (await auth.$context).socialProviders.find(p => p.id === source);
    const info = await provider?.getUserInfo(tokens as never).catch(() => null);
    image = info?.user.image ?? null;
    if (!image)
      throw new HttpError(
        502,
        'Bad Gateway',
        `${source} did not return a picture; sign in with it again`,
        'PICTURE_UNAVAILABLE',
        { provider: source },
      );
  }

  await auth.api.updateUser({ body: { image }, headers });
  return c.json({ image });
});
