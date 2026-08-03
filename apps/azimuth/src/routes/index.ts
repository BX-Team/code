import { Hono } from 'hono';
import type { Env } from '../env';
import { atlas } from './atlas';
import { internal } from './internal';

export const routes = new Hono<{ Bindings: Env }>();

routes.route('/atlas', atlas);
routes.route('/', internal);
