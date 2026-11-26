import { errorHandler, notFoundHandler } from '@bx-team/worker/error';
import { app } from './app';
import './profiles';
import './session';

app.onError(errorHandler);
app.notFound(notFoundHandler);

export default { fetch: app.fetch } satisfies ExportedHandler<Env>;

export { SkinsService } from './service';
