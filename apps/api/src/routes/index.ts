import { PublishBuildSchema, PublishReleaseSchema } from '@bx-team/types/schema/downloads';
import { router } from '../router';
import { edgeCache } from '../util/cache';
import { buildRoutes } from './builds';
import { internalRoutes } from './internal';
import { projectRoutes } from './projects';
import { publishRoutes } from './publish';
import { releaseRoutes } from './releases';

export const routes = router();

// Only the read side is cached; the publish routes are guarded and must not be.
routes.use('/v1/projects/*', edgeCache);
routes.use('/v1/projects', edgeCache);
routes.use('/v1/builds/*', edgeCache);
routes.use('/v1/releases/*', edgeCache);

routes.route('/', internalRoutes);
routes.route('/', projectRoutes);
routes.route('/', buildRoutes);
routes.route('/', releaseRoutes);
routes.route('/', publishRoutes);

routes.openAPIRegistry.registerComponent('securitySchemes', 'publishToken', {
  type: 'http',
  scheme: 'bearer',
  description: 'A publish token, valid for one project.',
});
routes.openAPIRegistry.register('PublishBuild', PublishBuildSchema);
routes.openAPIRegistry.register('PublishRelease', PublishReleaseSchema);

// Rendered from the same route definitions the handlers are registered with; `web` shows it at `/docs/api`.
routes.doc31('/v1/openapi.json', c => ({
  openapi: '3.1.0',
  info: {
    title: 'BX Team API',
    version: '1.0.0',
    description:
      'Downloads for every BX Team project. Reads are public and credential-less; publishing takes a project token. Every download URL points straight at the bucket, so this API is never in the path of a file.',
    license: { name: 'AGPL-3.0-only', url: 'https://www.gnu.org/licenses/agpl-3.0.html' },
  },
  servers: [{ url: new URL(c.req.url).origin }],
  tags: [
    { name: 'Downloads', description: 'Projects, versions, builds and releases.' },
    { name: 'Publishing', description: 'What a release workflow calls. Bearer token, one project each.' },
    { name: 'Service', description: 'Health and edge location.' },
  ],
}));
