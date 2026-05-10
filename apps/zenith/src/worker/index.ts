import { Hono } from 'hono';
import { cors } from 'hono/cors';
import {
  createManualIncident,
  deleteService,
  getAllServices,
  getGroupOrder,
  getServiceById,
  insertService,
  loadActiveIncidents,
  loadIncidentHistory,
  loadServicesWithStatus,
  loadUptimeHistory,
  resolveIncident,
  setGroupOrder,
  updateHeartbeat,
} from './db';
import { runChecks } from './monitor';
import type { Env } from './types';

const app = new Hono<{ Bindings: Env }>();

app.use('/api/*', cors());

app.use('/api/*', async (c, next) => {
  const ip = c.req.header('CF-Connecting-IP') ?? 'unknown';
  const { success } = await c.env.RATE_LIMITER_API.limit({ key: ip });
  if (!success) return c.json({ error: 'Too Many Requests' }, 429);
  return next();
});

app.use('/api/admin/*', async (c, next) => {
  const ip = c.req.header('CF-Connecting-IP') ?? 'unknown';
  const { success } = await c.env.RATE_LIMITER_ADMIN.limit({ key: ip });
  if (!success) return c.json({ error: 'Too Many Requests' }, 429);
  return next();
});

async function requireAdmin(c: any, next: any) {
  const key = c.req.header('X-Admin-Key');
  if (!key || key !== c.env.ADMIN_KEY) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  return next();
}

// ── Public API ──

app.get('/api/status', async c => {
  const [services, incidents, savedOrder] = await Promise.all([
    loadServicesWithStatus(c.env.DB),
    loadActiveIncidents(c.env.DB),
    getGroupOrder(c.env.DB),
  ]);
  const safeServices = services.map(s => (s.type === 'db' ? { ...s, url: null } : s));
  const allGroups = [...new Set(safeServices.map(s => s.group_name))];
  const groupOrder = savedOrder
    ? [...savedOrder.filter(g => allGroups.includes(g)), ...allGroups.filter(g => !savedOrder.includes(g))]
    : allGroups;
  return c.json({ services: safeServices, activeIncidents: incidents, updatedAt: Date.now(), groupOrder });
});

app.get('/api/summary', async c => {
  const [services, incidents] = await Promise.all([
    loadServicesWithStatus(c.env.DB),
    loadActiveIncidents(c.env.DB),
  ]);
  let status: 'ok' | 'degraded' | 'maintenance' = 'ok';
  if (incidents.some(i => i.type === 'manual')) {
    status = 'degraded';
  } else if (incidents.some(i => i.type === 'maintenance')) {
    status = 'maintenance';
  } else if (services.some(s => s.status && s.status.is_up === 0)) {
    status = 'degraded';
  }
  return c.json({ status });
});

app.get('/api/history', async c => {
  const history = await loadUptimeHistory(c.env.DB, 90);
  return c.json({ history });
});

app.get('/api/incidents', async c => {
  const days = Number(c.req.query('days') ?? '7');
  const [incidents, services] = await Promise.all([loadIncidentHistory(c.env.DB, days), getAllServices(c.env.DB)]);
  const serviceMap = new Map(services.map(s => [s.id, s.name]));
  const enriched = incidents.map(i => ({
    ...i,
    service_name: i.service_id ? (serviceMap.get(i.service_id) ?? i.service_id) : null,
  }));
  return c.json({ incidents: enriched });
});

// ── Heartbeat ──

app.post('/api/heartbeat/:id', async c => {
  const secret = c.req.header('X-Heartbeat-Secret');
  if (!secret || secret !== c.env.HEARTBEAT_SECRET) return c.json({ error: 'Unauthorized' }, 401);

  const serviceId = c.req.param('id');
  const { success } = await c.env.RATE_LIMITER_HEARTBEAT.limit({ key: serviceId });
  if (!success) return c.json({ error: 'Too Many Requests' }, 429);

  const service = await getServiceById(c.env.DB, serviceId);
  if (!service || (service.type !== 'push' && service.type !== 'db'))
    return c.json({ error: 'Service not found' }, 404);

  await updateHeartbeat(c.env.DB, serviceId);
  return c.json({ ok: true });
});

// ── Admin API ──

app.get('/api/admin/groups/order', requireAdmin, async c => {
  const [savedOrder, services] = await Promise.all([getGroupOrder(c.env.DB), getAllServices(c.env.DB)]);
  const allGroups = [...new Set(services.map(s => s.group_name))];
  const order = savedOrder
    ? [...savedOrder.filter(g => allGroups.includes(g)), ...allGroups.filter(g => !savedOrder.includes(g))]
    : allGroups;
  return c.json({ order });
});

app.put('/api/admin/groups/order', requireAdmin, async c => {
  const body = await c.req.json<{ order: string[] }>();
  if (!Array.isArray(body.order)) return c.json({ error: 'order must be an array' }, 400);
  await setGroupOrder(c.env.DB, body.order);
  return c.json({ ok: true });
});

app.get('/api/admin/services', requireAdmin, async c => {
  const services = await getAllServices(c.env.DB);
  return c.json({ services });
});

app.post('/api/admin/services', requireAdmin, async c => {
  const body = await c.req.json<{
    id: string;
    name: string;
    type: 'http' | 'push' | 'db';
    url?: string;
    method?: string;
    expected_status?: number;
    timeout_ms?: number;
    push_interval_ms?: number;
    fail_threshold?: number;
    group_name?: string;
    db_type?: string;
  }>();

  if (!body.id || !body.name || !body.type) return c.json({ error: 'Missing required fields' }, 400);
  if (body.type === 'http' && !body.url) return c.json({ error: 'URL required for HTTP services' }, 400);
  if (body.type === 'db' && !body.db_type) return c.json({ error: 'db_type required for database services' }, 400);

  const existing = await getServiceById(c.env.DB, body.id);
  if (existing) return c.json({ error: 'Service ID already exists' }, 409);

  await insertService(c.env.DB, {
    id: body.id,
    name: body.name,
    type: body.type,
    url: body.url ?? null,
    method: body.method ?? 'GET',
    expected_status: body.expected_status ?? 200,
    timeout_ms: body.timeout_ms ?? 10000,
    push_interval_ms: body.push_interval_ms ?? 60000,
    fail_threshold: body.fail_threshold ?? 2,
    group_name: body.group_name ?? 'Services',
    enabled: 1,
    db_type: body.db_type ?? null,
  });

  const service = await getServiceById(c.env.DB, body.id);
  return c.json({ service }, 201);
});

app.delete('/api/admin/services/:id', requireAdmin, async c => {
  const deleted = await deleteService(c.env.DB, c.req.param('id'));
  if (!deleted) return c.json({ error: 'Service not found' }, 404);
  return c.json({ ok: true });
});

app.get('/api/admin/incidents', requireAdmin, async c => {
  const [incidents, services] = await Promise.all([loadActiveIncidents(c.env.DB), getAllServices(c.env.DB)]);
  const serviceMap = new Map(services.map(s => [s.id, s.name]));
  const enriched = incidents.map(i => ({
    ...i,
    service_name: i.service_id ? (serviceMap.get(i.service_id) ?? i.service_id) : null,
  }));
  return c.json({ incidents: enriched });
});

app.post('/api/admin/incidents', requireAdmin, async c => {
  const body = await c.req.json<{
    type: 'manual' | 'maintenance';
    service_id?: string;
    title?: string;
  }>();

  if (!body.type || !['manual', 'maintenance'].includes(body.type)) {
    return c.json({ error: 'type must be manual or maintenance' }, 400);
  }
  if (body.type === 'manual' && !body.service_id) {
    return c.json({ error: 'service_id required for manual incidents' }, 400);
  }
  if (body.service_id) {
    const service = await getServiceById(c.env.DB, body.service_id);
    if (!service) return c.json({ error: 'Service not found' }, 404);
  }

  const incident = await createManualIncident(c.env.DB, body.type, body.service_id ?? null, body.title ?? null);
  return c.json({ incident }, 201);
});

app.post('/api/admin/incidents/:id/resolve', requireAdmin, async c => {
  await resolveIncident(c.env.DB, c.req.param('id'));
  return c.json({ ok: true });
});

// ── Serve SPA ──
app.all('*', c => c.env.ASSETS.fetch(c.req.raw));

export default {
  fetch: app.fetch,
  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(runChecks(env, env.DB));
  },
} satisfies ExportedHandler<Env>;
