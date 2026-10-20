import { Hono } from 'hono';
import type { HelmEnv } from '../context';
import { github } from './github';

export const routes = new Hono<HelmEnv>();

routes.get('/health', c => c.json({ status: 'ok' }));

routes.route('/', github);
