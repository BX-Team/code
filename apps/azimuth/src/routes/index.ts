import { Hono } from 'hono';
import type { AppEnv } from '../context';
import { openApiDocument } from '../openapi';
import { edgeCache } from '../util/cache';
import { buildRoutes } from './builds';
import { internalRoutes } from './internal';
import { projectRoutes } from './projects';
import { publishRoutes } from './publish';
import { releaseRoutes } from './releases';

const v1 = new Hono<AppEnv>();

// Only the read side is cached; the publish routes are guarded and must not be.
v1.use('/projects/*', edgeCache);
v1.use('/projects', edgeCache);
v1.use('/builds/*', edgeCache);
v1.use('/releases/*', edgeCache);

v1.get('/openapi.json', c => c.json(openApiDocument(new URL(c.req.url).origin)));

v1.route('/', projectRoutes);
v1.route('/', buildRoutes);
v1.route('/', releaseRoutes);
v1.route('/', publishRoutes);

export const routes = new Hono<AppEnv>();

routes.route('/', internalRoutes);
routes.route('/v1', v1);
