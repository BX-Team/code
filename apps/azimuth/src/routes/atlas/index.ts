import { Hono } from 'hono';
import { edgeCache } from '../../util/cache';
import { builds } from './builds';
import type { AtlasEnv } from './context';
import { projects } from './projects';
import { upload } from './upload';
import { versions } from './versions';

/**
 * Atlas/Downloads route group — project, version and build metadata backed by atlas-db
 * and the ATLAS_BUCKET R2 binding. Public GETs go through the edge cache; writes are
 * bearer-secret CI calls.
 */
export const atlas = new Hono<AtlasEnv>();

atlas.use('/*', edgeCache);

atlas.route('/', projects);
atlas.route('/', versions);
atlas.route('/', builds);
atlas.route('/', upload);
