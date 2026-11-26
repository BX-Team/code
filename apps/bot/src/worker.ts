import { errorHandler, notFoundHandler } from '@bx-team/worker/error';
import { Hono } from 'hono';
import type { BotEnv } from './context';
import { routes } from './routes';

const app = new Hono<BotEnv>();

app.route('/', routes);

app.onError(errorHandler);
app.notFound(notFoundHandler);

export default { fetch: app.fetch } satisfies ExportedHandler<Env>;
