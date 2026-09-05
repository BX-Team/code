import { Hono } from 'hono';
import { type BeaconEnv, withRest } from '../context';
import { github } from './github';
import { interactions } from './interactions';
import { publish } from './publish';

export const routes = new Hono<BeaconEnv>();

routes.use('*', withRest);

routes.get('/health', c => c.json({ status: 'ok' }));

routes.route('/', github);
routes.route('/', publish);
routes.route('/', interactions);
