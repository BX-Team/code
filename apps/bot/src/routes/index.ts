import { Hono } from 'hono';
import { type BotEnv, withDiscord } from '../context';
import { api } from './api';
import { artifacts } from './artifacts';
import { discord } from './discord';
import { github } from './github';

export const routes = new Hono<BotEnv>();

routes.use('*', withDiscord);

routes.get('/health', c => c.json({ status: 'ok' }));

routes.route('/github', github);
routes.route('/discord', discord);
routes.route('/api', api);
routes.route('/artifacts', artifacts);
