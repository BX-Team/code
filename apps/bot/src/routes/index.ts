import { Hono } from 'hono';
import { type BotEnv, withRest } from '../context';
import { api } from './api';
import { discord } from './discord';
import { github } from './github';

export const routes = new Hono<BotEnv>();

routes.use('*', withRest);

routes.get('/health', c => c.json({ status: 'ok' }));

routes.route('/github', github);
routes.route('/discord', discord);
routes.route('/api', api);
