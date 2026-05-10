<script setup lang="ts">
import { onMounted, ref } from 'vue';
import AppNav from '../components/AppNav.vue';
import type { Incident, Service } from '../types';

const KEY_STORAGE = 'zenith_admin_key';

const adminKey = ref('');
const keyInput = ref('');
const keyError = ref('');
const activeTab = ref<'services' | 'groups' | 'incidents'>('services');

// Services
const services = ref<Service[]>([]);
const servicesLoading = ref(false);
const showAddForm = ref(false);
const addForm = ref({
  id: '',
  name: '',
  type: 'http' as 'http' | 'push' | 'db',
  url: '',
  method: 'GET',
  expected_status: 200,
  timeout_ms: 10000,
  push_interval_ms: 60,
  fail_threshold: 2,
  group_name: 'Services',
  db_type: 'PostgreSQL',
});
const addError = ref('');
const addLoading = ref(false);

// Incidents
const incidents = ref<(Incident & { service_name?: string })[]>([]);
const incidentsLoading = ref(false);
const showCreateIncidentForm = ref(false);
const incidentForm = ref({
  type: 'manual' as 'manual' | 'maintenance',
  service_id: '',
  title: '',
});
const incidentFormError = ref('');
const incidentFormLoading = ref(false);

// Groups
const groups = ref<string[]>([]);
const groupsLoading = ref(false);
const groupsSaving = ref(false);
const groupsSaved = ref(false);
let dragIdx = -1;
let dragOriginal: string[] = [];
let dragDropped = false;

const DB_TYPES = ['PostgreSQL', 'ClickHouse', 'MySQL', 'Redis', 'MongoDB'];

async function apiRequest(path: string, options: RequestInit = {}) {
  const resp = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Key': adminKey.value,
      ...options.headers,
    },
  });
  if (resp.status === 401) {
    adminKey.value = '';
    localStorage.removeItem(KEY_STORAGE);
    keyError.value = 'Invalid key';
    throw new Error('Unauthorized');
  }
  return resp.json();
}

async function validateKey() {
  if (!keyInput.value.trim()) {
    keyError.value = 'Key is required';
    return;
  }
  adminKey.value = keyInput.value.trim();
  try {
    await apiRequest('/api/admin/services');
    localStorage.setItem(KEY_STORAGE, adminKey.value);
    keyError.value = '';
    loadAll();
  } catch {
    adminKey.value = '';
  }
}

async function loadServices() {
  servicesLoading.value = true;
  const data = await apiRequest('/api/admin/services');
  services.value = data.services ?? [];
  servicesLoading.value = false;
}

async function loadIncidents() {
  incidentsLoading.value = true;
  const data = await apiRequest('/api/admin/incidents');
  incidents.value = data.incidents ?? [];
  incidentsLoading.value = false;
}

async function loadGroupOrder() {
  groupsLoading.value = true;
  const data = await apiRequest('/api/admin/groups/order');
  groups.value = data.order ?? [];
  groupsLoading.value = false;
}

function onGroupDragStart(index: number) {
  dragIdx = index;
  dragOriginal = [...groups.value];
  dragDropped = false;
}

function onGroupDragOver(e: DragEvent, index: number) {
  e.preventDefault();
  if (dragIdx === index) return;
  const arr = [...groups.value];
  const [item] = arr.splice(dragIdx, 1);
  arr.splice(index, 0, item);
  groups.value = arr;
  dragIdx = index;
}

async function onGroupDrop() {
  dragDropped = true;
  dragIdx = -1;
  await saveGroupOrder();
}

function onGroupDragEnd() {
  if (!dragDropped) groups.value = [...dragOriginal];
  dragIdx = -1;
}

async function saveGroupOrder() {
  groupsSaving.value = true;
  groupsSaved.value = false;
  try {
    await apiRequest('/api/admin/groups/order', {
      method: 'PUT',
      body: JSON.stringify({ order: groups.value }),
    });
    groupsSaved.value = true;
    setTimeout(() => {
      groupsSaved.value = false;
    }, 2000);
  } finally {
    groupsSaving.value = false;
  }
}

function serviceCountInGroup(group: string) {
  return services.value.filter(s => s.group_name === group).length;
}

function loadAll() {
  loadServices();
  loadIncidents();
  loadGroupOrder();
}

async function addService() {
  addError.value = '';
  addLoading.value = true;
  try {
    await apiRequest('/api/admin/services', {
      method: 'POST',
      body: JSON.stringify({
        ...addForm.value,
        push_interval_ms: addForm.value.push_interval_ms * 1000,
        url: addForm.value.type === 'push' ? undefined : addForm.value.url || undefined,
        db_type: addForm.value.type === 'db' ? addForm.value.db_type : undefined,
      }),
    });
    showAddForm.value = false;
    resetForm();
    await loadServices();
  } catch (err: any) {
    addError.value = err?.message ?? 'Failed to add service';
  } finally {
    addLoading.value = false;
  }
}

async function removeService(id: string) {
  if (!confirm(`Remove service "${id}"?`)) return;
  await apiRequest(`/api/admin/services/${id}`, { method: 'DELETE' });
  await loadServices();
}

async function resolveIncident(id: string) {
  await apiRequest(`/api/admin/incidents/${id}/resolve`, { method: 'POST' });
  await loadIncidents();
}

async function createIncident() {
  incidentFormError.value = '';
  incidentFormLoading.value = true;
  try {
    await apiRequest('/api/admin/incidents', {
      method: 'POST',
      body: JSON.stringify({
        type: incidentForm.value.type,
        service_id: incidentForm.value.service_id || undefined,
        title: incidentForm.value.title || undefined,
      }),
    });
    showCreateIncidentForm.value = false;
    resetIncidentForm();
    await loadIncidents();
  } catch (err: any) {
    incidentFormError.value = err?.message ?? 'Failed to create incident';
  } finally {
    incidentFormLoading.value = false;
  }
}

function resetForm() {
  addForm.value = {
    id: '',
    name: '',
    type: 'http',
    url: '',
    method: 'GET',
    expected_status: 200,
    timeout_ms: 10000,
    push_interval_ms: 60,
    fail_threshold: 2,
    group_name: 'Services',
    db_type: 'PostgreSQL',
  };
}

function resetIncidentForm() {
  incidentForm.value = { type: 'manual', service_id: '', title: '' };
}

function formatDate(ms: number): string {
  return (
    new Date(ms).toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
    }) + ' UTC'
  );
}

onMounted(() => {
  const stored = localStorage.getItem(KEY_STORAGE);
  if (stored) {
    adminKey.value = stored;
    loadAll();
  }
});
</script>

<template>
	<div>
		<AppNav />
		<div class="z-shell admin-shell">
			<div class="admin-head">
				<h1>Admin Panel</h1>
				<p>Manage services and incidents.</p>
			</div>

			<!-- Key input -->
			<div v-if="!adminKey" class="key-gate">
				<div class="key-card">
					<div class="key-icon">
						<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5">
							<rect x="3" y="11" width="18" height="11" rx="2" />
							<path d="M7 11V7a5 5 0 0 1 10 0v4" />
						</svg>
					</div>
					<h2>Enter admin key</h2>
					<p>The admin key is configured as a Cloudflare Workers secret.</p>
					<div class="key-form">
						<input
							v-model="keyInput"
							type="password"
							placeholder="Admin key…"
							class="key-input"
							@keydown.enter="validateKey"
						/>
						<button class="btn-primary" @click="validateKey">Continue</button>
					</div>
					<p v-if="keyError" class="key-err">{{ keyError }}</p>
				</div>
			</div>

			<!-- Admin panel -->
			<template v-else>
				<div class="tabs">
					<button :class="{ active: activeTab === 'services' }" @click="activeTab = 'services'">Services</button>
					<button :class="{ active: activeTab === 'groups' }" @click="activeTab = 'groups'">Groups</button>
					<button :class="{ active: activeTab === 'incidents' }" @click="activeTab = 'incidents'">Active Incidents</button>
					<button class="logout" @click="() => { adminKey = ''; localStorage.removeItem(KEY_STORAGE) }">Sign out</button>
				</div>

				<!-- Services tab -->
				<div v-if="activeTab === 'services'" class="tab-content">
					<div class="tab-header">
						<h2>Services</h2>
						<button class="btn-primary" @click="showAddForm = !showAddForm">
							{{ showAddForm ? 'Cancel' : '+ Add service' }}
						</button>
					</div>

					<div v-if="showAddForm" class="add-form">
						<h3>New service</h3>
						<div class="form-grid">
							<label>
								ID
								<input v-model="addForm.id" placeholder="my-service" />
							</label>
							<label>
								Name
								<input v-model="addForm.name" placeholder="My Service" />
							</label>
							<label>
								Type
								<select v-model="addForm.type">
									<option value="http">HTTP</option>
									<option value="push">Push heartbeat</option>
									<option value="db">Database</option>
								</select>
							</label>
							<label>
								Group
								<input v-model="addForm.group_name" placeholder="Services" />
							</label>
							<template v-if="addForm.type === 'http'">
								<label>
									URL
									<input v-model="addForm.url" placeholder="https://example.com" />
								</label>
								<label>
									Method
									<select v-model="addForm.method">
										<option>GET</option>
										<option>POST</option>
										<option>HEAD</option>
									</select>
								</label>
								<label>
									Expected status
									<input v-model.number="addForm.expected_status" type="number" placeholder="200" />
								</label>
								<label>
									Timeout (ms)
									<input v-model.number="addForm.timeout_ms" type="number" placeholder="10000" />
								</label>
							</template>
							<template v-else-if="addForm.type === 'db'">
								<label>
									Database type
									<select v-model="addForm.db_type">
										<option v-for="dt in DB_TYPES" :key="dt">{{ dt }}</option>
									</select>
								</label>
								<label>
									Host (optional)
									<input v-model="addForm.url" placeholder="db.example.com:5432" />
								</label>
								<label>
									Heartbeat interval (seconds)
									<input v-model.number="addForm.push_interval_ms" type="number" placeholder="60" />
								</label>
							</template>
							<template v-else>
								<label>
									Push interval (seconds)
									<input v-model.number="addForm.push_interval_ms" type="number" placeholder="60" />
								</label>
							</template>
							<label>
								Fail threshold
								<input v-model.number="addForm.fail_threshold" type="number" placeholder="2" />
							</label>
						</div>
						<p v-if="addError" class="form-err">{{ addError }}</p>
						<div class="form-actions">
							<button class="btn-primary" :disabled="addLoading" @click="addService">
								{{ addLoading ? 'Adding…' : 'Add service' }}
							</button>
						</div>
					</div>

					<div v-if="servicesLoading" class="empty">Loading…</div>
					<div v-else-if="services.length === 0" class="empty">No services configured.</div>
					<div v-else class="services-table">
						<div class="table-head">
							<span>Name</span>
							<span>ID</span>
							<span>Type</span>
							<span>Group</span>
							<span>Target</span>
							<span />
						</div>
						<div v-for="svc in services" :key="svc.id" class="table-row">
							<span class="svc-name">{{ svc.name }}</span>
							<code>{{ svc.id }}</code>
							<span class="badge">{{ svc.type === 'db' ? (svc.db_type ?? 'DB') : svc.type.toUpperCase() }}</span>
							<span class="dim">{{ svc.group_name }}</span>
							<span class="dim url">{{ svc.url ?? (svc.type === 'push' || svc.type === 'db' ? `heartbeat/${Math.round(svc.push_interval_ms / 1000)}s` : '—') }}</span>
							<button class="btn-danger" @click="removeService(svc.id)">Remove</button>
						</div>
					</div>
				</div>

				<!-- Groups tab -->
				<div v-if="activeTab === 'groups'" class="tab-content">
					<div class="tab-header">
						<h2>Category Order</h2>
						<span v-if="groupsSaving" class="status-label">Saving…</span>
						<span v-else-if="groupsSaved" class="status-label saved">Saved</span>
					</div>
					<div v-if="groupsLoading" class="empty">Loading…</div>
					<div v-else-if="groups.length === 0" class="empty">No groups yet. Add services first.</div>
					<div v-else class="groups-list">
						<div
							v-for="(group, i) in groups"
							:key="group"
							class="group-drag-row"
							draggable="true"
							@dragstart="onGroupDragStart(i)"
							@dragover="onGroupDragOver($event, i)"
							@drop="onGroupDrop"
							@dragend="onGroupDragEnd"
						>
							<span class="drag-handle">
								<svg viewBox="0 0 10 16" width="10" height="16" fill="currentColor">
									<circle cx="3" cy="3" r="1.4"/>
									<circle cx="7" cy="3" r="1.4"/>
									<circle cx="3" cy="8" r="1.4"/>
									<circle cx="7" cy="8" r="1.4"/>
									<circle cx="3" cy="13" r="1.4"/>
									<circle cx="7" cy="13" r="1.4"/>
								</svg>
							</span>
							<span class="group-drag-name">{{ group }}</span>
							<span class="group-drag-cnt dim">{{ serviceCountInGroup(group) }} services</span>
						</div>
					</div>
				</div>

				<!-- Incidents tab -->
				<div v-if="activeTab === 'incidents'" class="tab-content">
					<div class="tab-header">
						<h2>Active Incidents</h2>
						<div class="header-actions">
							<button class="btn-ghost" @click="loadIncidents">Refresh</button>
							<button class="btn-primary" @click="showCreateIncidentForm = !showCreateIncidentForm">
								{{ showCreateIncidentForm ? 'Cancel' : '+ Create' }}
							</button>
						</div>
					</div>

					<div v-if="showCreateIncidentForm" class="add-form">
						<h3>Create incident</h3>
						<div class="form-grid">
							<label>
								Type
								<select v-model="incidentForm.type">
									<option value="manual">Incident (manual)</option>
									<option value="maintenance">Maintenance</option>
								</select>
							</label>
							<label>
								Service {{ incidentForm.type === 'manual' ? '(required)' : '(optional)' }}
								<select v-model="incidentForm.service_id">
									<option value="">— none —</option>
									<option v-for="svc in services" :key="svc.id" :value="svc.id">{{ svc.name }}</option>
								</select>
							</label>
							<label class="full">
								Title (optional)
								<input v-model="incidentForm.title" placeholder="Custom description…" />
							</label>
						</div>
						<p v-if="incidentFormError" class="form-err">{{ incidentFormError }}</p>
						<div class="form-actions">
							<button class="btn-primary" :disabled="incidentFormLoading" @click="createIncident">
								{{ incidentFormLoading ? 'Creating…' : 'Create' }}
							</button>
						</div>
					</div>

					<div v-if="incidentsLoading" class="empty">Loading…</div>
					<div v-else-if="incidents.length === 0" class="empty">No active incidents.</div>
					<div v-else class="services-table">
						<div class="table-head">
							<span>Service</span>
							<span>Type</span>
							<span>Since</span>
							<span>ID</span>
							<span />
						</div>
						<div v-for="inc in incidents" :key="inc.id" class="table-row">
							<span class="svc-name">{{ inc.service_name ?? inc.service_id ?? '—' }}</span>
							<span class="badge" :class="inc.type === 'maintenance' ? 'badge-warn' : 'badge-err'">{{ inc.type }}</span>
							<span class="dim">{{ formatDate(inc.started_at) }}</span>
							<code class="small">{{ inc.id.slice(0, 8) }}</code>
							<button class="btn-warn" @click="resolveIncident(inc.id)">Resolve</button>
						</div>
					</div>
				</div>
			</template>
		</div>
	</div>
</template>

<style scoped>
.admin-shell {
	padding-top: 32px;
}

.admin-head {
	margin: 40px 0 28px;
}

.admin-head h1 {
	margin: 0 0 6px;
	font: 700 32px var(--font-sans);
	color: var(--fg-hi);
	letter-spacing: -0.02em;
}

.admin-head p {
	margin: 0;
	font: 400 14px var(--font-sans);
	color: var(--dim);
}

/* Key gate */
.key-gate {
	display: flex;
	justify-content: center;
	margin-top: 48px;
}

.key-card {
	background: var(--bg-1);
	border: 1px solid var(--line);
	border-radius: var(--r-lg);
	padding: 32px;
	max-width: 420px;
	width: 100%;
	text-align: center;
}

.key-icon {
	width: 48px;
	height: 48px;
	border-radius: 12px;
	background: var(--bg-2);
	border: 1px solid var(--line);
	display: grid;
	place-items: center;
	color: var(--brand);
	margin: 0 auto 16px;
}

.key-card h2 {
	margin: 0 0 6px;
	font: 600 18px var(--font-sans);
	color: var(--fg-hi);
}

.key-card p {
	margin: 0 0 20px;
	font: 400 13px var(--font-sans);
	color: var(--dim);
}

.key-form {
	display: flex;
	gap: 8px;
}

.key-input {
	flex: 1;
	padding: 9px 12px;
	background: var(--bg-2);
	border: 1px solid var(--line);
	border-radius: var(--r-md);
	color: var(--fg-hi);
	font: 500 13px var(--font-mono);
	outline: none;
}

.key-input:focus {
	border-color: var(--line-2);
}

.key-err {
	margin: 10px 0 0;
	font: 400 12px var(--font-sans);
	color: var(--err);
}

/* Tabs */
.tabs {
	display: flex;
	gap: 4px;
	margin-bottom: 20px;
	background: var(--bg-1);
	border: 1px solid var(--line);
	border-radius: var(--r-full);
	padding: 4px;
	width: fit-content;
}

.tabs button {
	padding: 7px 16px;
	border-radius: var(--r-full);
	font: 500 13px var(--font-sans);
	color: var(--dim);
	background: transparent;
	border: none;
	cursor: pointer;
	transition: all 0.15s;
}

.tabs button.active {
	background: var(--bg-3);
	color: var(--fg-hi);
}

.tabs button:hover:not(.active) {
	color: var(--fg-hi);
}

.tabs .logout {
	margin-left: 8px;
	color: var(--mute);
}

/* Tab content */
.tab-content {
	background: var(--bg-1);
	border: 1px solid var(--line);
	border-radius: var(--r-lg);
	overflow: hidden;
}

.tab-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 18px 20px;
	border-bottom: 1px solid var(--line);
}

.tab-header h2 {
	margin: 0;
	font: 600 15px var(--font-sans);
	color: var(--fg-hi);
}

.header-actions {
	display: flex;
	gap: 8px;
	align-items: center;
}

.empty {
	padding: 24px 20px;
	font: 400 13px var(--font-sans);
	color: var(--mute);
	text-align: center;
}

/* Add form */
.add-form {
	padding: 20px;
	border-bottom: 1px solid var(--line);
	background: var(--bg-2);
}

.add-form h3 {
	margin: 0 0 16px;
	font: 600 14px var(--font-sans);
	color: var(--fg-hi);
}

.form-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
	gap: 12px;
	margin-bottom: 16px;
}

.form-grid label {
	display: flex;
	flex-direction: column;
	gap: 5px;
	font: 500 11.5px var(--font-sans);
	color: var(--dim);
}

.form-grid label.full {
	grid-column: 1 / -1;
}

.form-grid input,
.form-grid select {
	padding: 8px 10px;
	background: var(--bg-1);
	border: 1px solid var(--line);
	border-radius: var(--r-md);
	color: var(--fg-hi);
	font: 400 13px var(--font-sans);
	outline: none;
}

.form-grid input:focus,
.form-grid select:focus {
	border-color: var(--line-2);
}

.form-err {
	margin: 0 0 12px;
	font: 400 12px var(--font-sans);
	color: var(--err);
}

.form-actions {
	display: flex;
	justify-content: flex-end;
}

/* Services table */
.services-table {
	font: 400 13px var(--font-sans);
}

.table-head {
	display: grid;
	grid-template-columns: 1fr 1fr 90px 100px 1fr 80px;
	gap: 12px;
	padding: 10px 20px;
	font: 600 11px var(--font-mono);
	color: var(--mute);
	letter-spacing: 0.04em;
	text-transform: uppercase;
	border-bottom: 1px solid var(--line);
}

.table-row {
	display: grid;
	grid-template-columns: 1fr 1fr 90px 100px 1fr 80px;
	gap: 12px;
	padding: 14px 20px;
	border-bottom: 1px solid var(--line);
	align-items: center;
}

.table-row:last-child {
	border-bottom: 0;
}

.table-row:hover {
	background: var(--bg-2);
}

.svc-name {
	font: 600 13px var(--font-sans);
	color: var(--fg-hi);
}

.dim {
	color: var(--dim);
}

.url {
	font: 400 12px var(--font-mono);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

code {
	font: 500 12px var(--font-mono);
	color: var(--dim);
}

code.small {
	font-size: 11px;
}

.badge {
	display: inline-flex;
	font: 500 10px var(--font-mono);
	padding: 2px 6px;
	border-radius: 4px;
	background: var(--bg-3);
	border: 1px solid var(--line);
	color: var(--dim);
	letter-spacing: 0.04em;
}

.badge-warn {
	background: color-mix(in oklab, var(--warn) 14%, transparent);
	border-color: color-mix(in oklab, var(--warn) 35%, transparent);
	color: var(--warn);
}

.badge-err {
	background: color-mix(in oklab, var(--err) 14%, transparent);
	border-color: color-mix(in oklab, var(--err) 35%, transparent);
	color: var(--err);
}

/* Buttons */
.btn-primary {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	padding: 8px 14px;
	background: var(--brand);
	color: var(--bg-0);
	border: none;
	border-radius: var(--r-full);
	font: 600 12.5px var(--font-sans);
	cursor: pointer;
}

.btn-primary:hover {
	box-shadow: 0 0 0 3px var(--brand-soft);
}

.btn-primary:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.btn-danger {
	padding: 5px 10px;
	background: color-mix(in oklab, var(--err) 15%, transparent);
	border: 1px solid color-mix(in oklab, var(--err) 35%, transparent);
	color: var(--err);
	border-radius: var(--r-sm);
	font: 500 12px var(--font-sans);
	cursor: pointer;
}

.btn-danger:hover {
	background: color-mix(in oklab, var(--err) 25%, transparent);
}

.btn-warn {
	padding: 5px 10px;
	background: color-mix(in oklab, var(--warn) 15%, transparent);
	border: 1px solid color-mix(in oklab, var(--warn) 35%, transparent);
	color: var(--warn);
	border-radius: var(--r-sm);
	font: 500 12px var(--font-sans);
	cursor: pointer;
}

.btn-warn:hover {
	background: color-mix(in oklab, var(--warn) 25%, transparent);
}

.btn-ghost {
	padding: 7px 14px;
	background: transparent;
	border: 1px solid var(--line);
	color: var(--dim);
	border-radius: var(--r-full);
	font: 500 12px var(--font-sans);
	cursor: pointer;
}

.btn-ghost:hover {
	border-color: var(--line-2);
	color: var(--fg-hi);
}

/* Groups */
.status-label {
	font: 500 12px var(--font-sans);
	color: var(--mute);
}

.status-label.saved {
	color: var(--brand-2);
}

.groups-list {
	font: 400 13px var(--font-sans);
}

.group-drag-row {
	display: flex;
	align-items: center;
	gap: 14px;
	padding: 14px 20px;
	border-bottom: 1px solid var(--line);
	cursor: grab;
	user-select: none;
	transition: background 0.1s;
}

.group-drag-row:last-child {
	border-bottom: 0;
}

.group-drag-row:hover {
	background: var(--bg-2);
}

.group-drag-row:active {
	cursor: grabbing;
}

.drag-handle {
	color: var(--mute);
	display: flex;
	align-items: center;
	flex-shrink: 0;
}

.group-drag-row:hover .drag-handle {
	color: var(--dim);
}

.group-drag-name {
	font: 600 13px var(--font-sans);
	color: var(--fg-hi);
	flex: 1;
}

.group-drag-cnt {
	font: 500 11px var(--font-mono);
	color: var(--mute);
	letter-spacing: 0.04em;
}

@media (max-width: 760px) {
	.table-head,
	.table-row {
		grid-template-columns: 1fr 1fr 80px;
	}

	.table-head span:nth-child(3) ~ span,
	.table-row span:nth-child(3) ~ *:not(button) {
		display: none;
	}
}
</style>
