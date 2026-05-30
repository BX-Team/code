<script setup lang="ts">
import { Check, RotateCcw } from '@lucide/vue';
import { toast } from 'vue-sonner';
import ProjectTabs from '@/components/dashboard/ProjectTabs.vue';

definePageMeta({ layout: 'dashboard', middleware: 'auth' });
useHead({ title: 'Errors', titleTemplate: '%s | Pulsify' });

type Status = 'unresolved' | 'resolved' | 'all';
type Sort = 'last_seen' | 'first_seen' | 'events';

interface ErrorRow {
  id: string;
  plugin: string;
  message: string;
  stacktrace: string;
  level: string;
  count: number;
  firstSeenAt: string;
  lastSeenAt: string;
  resolved: boolean;
  resolvedAt: string | null;
  serverVersion: string | null;
  serverSoftware: string | null;
  pluginVersion: string | null;
}
interface ErrorsResponse {
  errors: ErrorRow[];
  total: number;
  counts: { unresolved: number; resolved: number; all: number };
  sort: Sort;
  status: Status;
}

const route = useRoute();
const slug = computed(() => route.params.slug as string);

const { data: projects } = await useProjects();
const project = computed(() => (projects.value ?? []).find(p => p.slug === slug.value) ?? null);

const requestFetch = useRequestFetch();

const status = ref<Status>('unresolved');
const sort = ref<Sort>('last_seen');

const { data, pending, refresh } = await useAsyncData<ErrorsResponse | null>(
  `project-errors-page-${slug.value}`,
  () =>
    project.value
      ? requestFetch<ErrorsResponse>(`/api/v3/projects/${project.value.id}/errors`, {
          query: { status: status.value, sort: sort.value },
        })
      : Promise.resolve(null),
  { watch: [status, sort, project] },
);

interface CrossError {
  id: string;
  message: string;
  stacktrace: string;
  level: string;
  count: number;
  serverCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
}
interface CrossErrorsResponse {
  errors: CrossError[];
  total: number;
  totalServers: number;
  sharingServers: number;
  verified: boolean;
}

const { data: crossData, pending: crossPending } = await useAsyncData<CrossErrorsResponse | null>(
  `cross-errors-${slug.value}`,
  () =>
    project.value && project.value.type !== 'server'
      ? requestFetch<CrossErrorsResponse>(`/api/v3/projects/${project.value.id}/cross-errors`)
      : Promise.resolve(null),
  { watch: [project] },
);

function levelClass(level: string) {
  if (level === 'error' || level === 'fatal') return 'err';
  if (level === 'warning' || level === 'warn') return 'warn';
  return 'info';
}

const expanded = ref<string | null>(null);

const pendingResolve = ref<Set<string>>(new Set());

async function toggleResolved(err: ErrorRow, event: MouseEvent) {
  event.stopPropagation();
  if (!project.value || pendingResolve.value.has(err.id)) return;
  pendingResolve.value.add(err.id);
  const nextResolved = !err.resolved;
  try {
    await $fetch(`/api/v3/projects/${project.value.id}/errors/resolve`, {
      method: 'POST',
      body: { fingerprint: err.id, resolved: nextResolved },
    });
    toast.success(nextResolved ? 'Issue resolved' : 'Issue reopened');
    await refresh();
  } catch (e: any) {
    toast.error(e?.data?.message ?? 'Failed to update issue');
  } finally {
    pendingResolve.value.delete(err.id);
  }
}

const sortOptions: Array<{ value: Sort; label: string }> = [
  { value: 'last_seen', label: 'Last seen' },
  { value: 'first_seen', label: 'First seen' },
  { value: 'events', label: 'Events' },
];
</script>

<template>
	<div v-if="!project" class="px-4 lg:px-6">
		<div class="not-found">Project not found.</div>
	</div>
	<template v-else>
		<ProjectTabs :slug="project.slug" :project-type="project.type" />

		<div class="px-4 lg:px-6">
			<div class="card err-card">
				<div class="card-hd">
					<div class="hd-l">
						<div class="status-tabs">
							<button
								class="status-tab"
								:class="{ active: status === 'unresolved' }"
								@click="status = 'unresolved'"
							>
								Unresolved
								<span class="count">{{ data?.counts?.unresolved ?? 0 }}</span>
							</button>
							<button
								class="status-tab"
								:class="{ active: status === 'resolved' }"
								@click="status = 'resolved'"
							>
								Resolved
								<span class="count">{{ data?.counts?.resolved ?? 0 }}</span>
							</button>
							<button
								class="status-tab"
								:class="{ active: status === 'all' }"
								@click="status = 'all'"
							>
								All
								<span class="count">{{ data?.counts?.all ?? 0 }}</span>
							</button>
						</div>
					</div>
					<div class="hd-r">
						<span class="sort-label">Sort by</span>
						<div class="sort-seg">
							<button
								v-for="opt in sortOptions"
								:key="opt.value"
								class="seg"
								:class="{ active: sort === opt.value }"
								@click="sort = opt.value"
							>{{ opt.label }}</button>
						</div>
					</div>
				</div>

				<div v-if="pending" class="err-loading">
					<div v-for="n in 5" :key="n" class="err-row-skeleton">
						<span class="sk" style="width:60px" />
						<span class="sk" style="width:100%;max-width:340px" />
						<span class="sk" style="width:50px;margin-left:auto" />
					</div>
				</div>
				<div v-else-if="!data?.errors.length" class="err-empty">
					<template v-if="status === 'resolved'">No resolved issues yet.</template>
					<template v-else-if="status === 'unresolved'">No unresolved issues. Nice.</template>
					<template v-else>No issues reported.</template>
				</div>
				<template v-else>
					<div
						v-for="err in data.errors"
						:key="err.id"
						class="err-row"
						:class="{ expanded: expanded === err.id, resolved: err.resolved }"
						@click="expanded = expanded === err.id ? null : err.id"
					>
						<div class="err-main">
							<span class="lvl" :class="levelClass(err.level)">{{ err.level }}</span>
							<div class="err-msg">
								<div class="err-title">
									{{ err.message }}
									<span v-if="err.resolved" class="resolved-tag">resolved</span>
								</div>
								<div class="err-meta">{{ err.plugin }} · first seen {{ relativeTime(err.firstSeenAt) }}</div>
								<div v-if="err.serverSoftware || err.pluginVersion" class="ctx-pills">
									<span v-if="err.serverSoftware" class="ctx-pill">{{ err.serverSoftware }}<template v-if="err.serverVersion"> {{ err.serverVersion }}</template></span>
									<span v-if="err.pluginVersion" class="ctx-pill">v{{ err.pluginVersion }}</span>
								</div>
							</div>
							<div class="err-count">
								{{ err.count.toLocaleString() }}
								<span class="sub">events</span>
							</div>
							<div class="err-when">{{ relativeTime(err.lastSeenAt) }}</div>
							<button
								class="resolve-btn"
								:class="{ resolved: err.resolved }"
								:disabled="pendingResolve.has(err.id)"
								:title="err.resolved ? 'Reopen issue' : 'Mark as resolved'"
								@click="toggleResolved(err, $event)"
							>
								<RotateCcw v-if="err.resolved" :size="13" :stroke-width="1.8" />
								<Check v-else :size="13" :stroke-width="2" />
							</button>
							<svg v-if="err.stacktrace" class="chevron" :class="{ open: expanded === err.id }" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
							<span v-else class="chevron-placeholder" />
						</div>
						<div v-if="expanded === err.id && err.stacktrace" class="err-stack">
							<pre>{{ err.stacktrace }}</pre>
						</div>
					</div>
				</template>
			</div>
		</div>
		<div v-if="project.type !== 'server'" class="cross-errors-section px-4 lg:px-6">
			<div class="card cross-card">
				<div class="card-hd">
					<div class="hd-l">
						<h3>Community reports</h3>
						<p>Errors reported by servers running your plugin</p>
					</div>
					<div v-if="crossData?.verified" class="coverage-badge">
						<span class="cov-text">Active on <strong>{{ crossData.totalServers }}</strong> server{{ crossData.totalServers !== 1 ? 's' : '' }}</span>
						<span class="cov-sep">·</span>
						<span class="cov-text"><strong>{{ crossData.sharingServers }}</strong> transmitting</span>
					</div>
				</div>
				<div v-if="crossPending" class="cross-loading">
					<div v-for="n in 3" :key="n" class="err-row-skeleton">
						<span class="sk" style="width:60px" />
						<span class="sk" style="width:100%;max-width:340px" />
						<span class="sk" style="width:80px;margin-left:auto" />
					</div>
				</div>
				<div v-else-if="crossData && !crossData.verified" class="cross-empty">
					Community reports are available once your plugin name is verified. Verification confirms you own
					the <strong>{{ project.name }}</strong> name so crashes from servers running it can be attributed to you.
				</div>
				<div v-else-if="!crossData?.errors?.length" class="cross-empty">
					No community crashes yet. Servers need to install your plugin and report to Pulsify.
				</div>
				<template v-else>
					<div
						v-for="err in crossData.errors"
						:key="err.id"
						class="err-row"
						:class="{ expanded: expanded === ('x-' + err.id) }"
						@click="expanded = expanded === ('x-' + err.id) ? null : ('x-' + err.id)"
					>
						<div class="err-main cross-row-grid">
							<span class="lvl" :class="levelClass(err.level)">{{ err.level }}</span>
							<div class="err-msg">
								<div class="err-title">{{ err.message }}</div>
								<div class="err-meta">{{ err.serverCount }} server{{ err.serverCount !== 1 ? 's' : '' }} · first seen {{ relativeTime(err.firstSeenAt) }}</div>
							</div>
							<div class="err-count">{{ err.count.toLocaleString() }}<span class="sub">events</span></div>
							<div class="err-when">{{ relativeTime(err.lastSeenAt) }}</div>
							<svg v-if="err.stacktrace" class="chevron" :class="{ open: expanded === ('x-' + err.id) }" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
							<span v-else class="chevron-placeholder" />
						</div>
						<div v-if="expanded === ('x-' + err.id) && err.stacktrace" class="err-stack">
							<pre>{{ err.stacktrace }}</pre>
						</div>
					</div>
				</template>
			</div>
		</div>
	</template>
</template>

<style scoped>
.not-found {
	border: 1px solid var(--line);
	border-radius: 10px;
	padding: 48px;
	text-align: center;
	color: var(--mute);
}

.card {
	background: var(--bg-1);
	border: 1px solid var(--line);
	border-radius: 12px;
	overflow: hidden;
}
.err-card { padding: 0; }

.card-hd {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	padding: 12px 18px;
	border-bottom: 1px solid var(--line);
	flex-wrap: wrap;
}
.hd-l { display: flex; align-items: center; gap: 12px; }
.hd-r { display: flex; align-items: center; gap: 10px; }

.status-tabs {
	display: inline-flex;
	background: var(--bg-2);
	border: 1px solid var(--line);
	border-radius: 8px;
	padding: 3px;
	gap: 2px;
}
.status-tab {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	padding: 5px 12px;
	font: 500 12px var(--font-sans);
	color: var(--dim);
	border-radius: 6px;
	cursor: pointer;
	border: none;
	background: transparent;
}
.status-tab.active { background: var(--bg-3); color: var(--fg-hi); }
.status-tab:hover:not(.active) { color: var(--fg-hi); }
.status-tab .count {
	font: 600 10.5px var(--font-mono);
	color: var(--mute);
	padding: 1px 6px;
	border-radius: 9999px;
	background: var(--bg-1);
	border: 1px solid var(--line);
}
.status-tab.active .count { color: var(--fg-hi); }

.sort-label { font: 500 11.5px var(--font-sans); color: var(--mute); }
.sort-seg {
	display: inline-flex;
	background: var(--bg-2);
	border: 1px solid var(--line);
	border-radius: 8px;
	padding: 3px;
}
.seg {
	padding: 5px 10px;
	font: 500 11.5px var(--font-sans);
	color: var(--dim);
	border-radius: 6px;
	cursor: pointer;
	border: none;
	background: transparent;
}
.seg.active { background: var(--bg-3); color: var(--fg-hi); }
.seg:hover:not(.active) { color: var(--fg-hi); }

.err-empty {
	padding: 48px;
	text-align: center;
	font: 400 13px var(--font-sans);
	color: var(--mute);
}

.err-loading { display: flex; flex-direction: column; }
.err-row-skeleton {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 14px 18px;
	border-bottom: 1px solid var(--line);
}
.sk {
	display: block;
	height: 14px;
	border-radius: 4px;
	background: var(--bg-3);
	animation: pulse 1.4s ease-in-out infinite;
}
@keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.4 } }

.err-row {
	border-bottom: 1px solid var(--line);
	cursor: pointer;
}
.err-row:last-child { border-bottom: 0; }
.err-row:hover .err-main { background: var(--bg-2); }
.err-row.resolved .err-main { opacity: 0.6; }
.err-row.resolved:hover .err-main { opacity: 0.85; }

.err-main {
	display: grid;
	grid-template-columns: 80px 1fr 80px 90px 28px 16px;
	gap: 12px;
	padding: 12px 18px;
	align-items: center;
}

.chevron {
	color: var(--mute);
	transition: transform 0.2s, color 0.15s;
	flex-shrink: 0;
}
.chevron.open { transform: rotate(180deg); color: var(--dim); }
.err-row:hover .chevron { color: var(--dim); }
.chevron-placeholder { display: inline-block; width: 14px; height: 14px; }

.lvl {
	display: inline-flex;
	align-items: center;
	font: 600 9.5px var(--font-mono);
	padding: 3px 7px;
	border-radius: 4px;
	letter-spacing: .05em;
	text-transform: uppercase;
}
.lvl.err {
	background: color-mix(in oklab, var(--err) 22%, transparent);
	color: var(--err);
	border: 1px solid color-mix(in oklab, var(--err) 50%, transparent);
}
.lvl.warn {
	background: color-mix(in oklab, var(--warn) 20%, transparent);
	color: var(--warn);
	border: 1px solid color-mix(in oklab, var(--warn) 45%, transparent);
}
.lvl.info {
	background: color-mix(in oklab, var(--info) 20%, transparent);
	color: var(--info);
	border: 1px solid color-mix(in oklab, var(--info) 45%, transparent);
}

.err-msg { min-width: 0; }
.err-title {
	font: 500 13px var(--font-sans);
	color: var(--fg-hi);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}
.err-row.resolved .err-title { text-decoration: line-through; }
.resolved-tag {
	display: inline-block;
	margin-left: 8px;
	font: 600 9px var(--font-mono);
	padding: 2px 6px;
	border-radius: 4px;
	letter-spacing: .04em;
	text-transform: uppercase;
	background: color-mix(in oklab, var(--ok, var(--brand-2)) 18%, transparent);
	color: var(--ok, var(--brand-2));
	border: 1px solid color-mix(in oklab, var(--ok, var(--brand-2)) 40%, transparent);
	text-decoration: none;
	vertical-align: 1px;
}
.err-meta {
	font: 400 11.5px var(--font-mono);
	color: var(--mute);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	margin-top: 2px;
}

.err-count { font: 600 13px var(--font-mono); color: var(--fg-hi); text-align: right; }
.err-count .sub { display: block; font: 400 10.5px var(--font-mono); color: var(--mute); }
.err-when { font: 400 11.5px var(--font-mono); color: var(--mute); text-align: right; }

.resolve-btn {
	display: inline-grid;
	place-items: center;
	width: 26px;
	height: 26px;
	border-radius: 6px;
	border: 1px solid var(--line);
	background: var(--bg-1);
	color: var(--dim);
	cursor: pointer;
	transition: color 0.15s, border-color 0.15s, background 0.15s;
}
.resolve-btn:hover:not(:disabled) {
	color: var(--ok, var(--brand-2));
	border-color: color-mix(in oklab, var(--ok, var(--brand-2)) 50%, var(--line));
	background: color-mix(in oklab, var(--ok, var(--brand-2)) 12%, var(--bg-1));
}
.resolve-btn.resolved {
	color: var(--ok, var(--brand-2));
	border-color: color-mix(in oklab, var(--ok, var(--brand-2)) 40%, var(--line));
	background: color-mix(in oklab, var(--ok, var(--brand-2)) 10%, var(--bg-1));
}
.resolve-btn.resolved:hover:not(:disabled) {
	color: var(--dim);
	border-color: var(--line);
	background: var(--bg-2);
}
.resolve-btn:disabled { opacity: 0.5; cursor: default; }

.err-stack {
	border-top: 1px solid var(--line);
	background: var(--bg-0);
	padding: 14px 18px;
}
.err-stack pre {
	margin: 0;
	font: 400 11.5px var(--font-mono);
	color: var(--dim);
	white-space: pre-wrap;
	word-break: break-all;
	line-height: 1.6;
}

.px-4 { padding-left: 1rem; padding-right: 1rem; }
@media (min-width: 1024px) { .lg\:px-6 { padding-left: 1.5rem; padding-right: 1.5rem; } }

.ctx-pills { display: flex; gap: 4px; margin-top: 4px; flex-wrap: wrap; }
.ctx-pill {
	font: 500 10px var(--font-mono);
	padding: 1px 6px;
	border-radius: 4px;
	background: var(--bg-3);
	border: 1px solid var(--line);
	color: var(--dim);
}

.cross-errors-section { margin-top: 18px; }
.cross-card { padding: 0; }
.cross-card .card-hd {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 14px 18px;
	border-bottom: 1px solid var(--line);
	flex-wrap: wrap;
	gap: 10px;
}
.cross-card .card-hd h3 { margin: 0 0 2px; font: 600 14px var(--font-sans); color: var(--fg-hi); }
.cross-card .card-hd p { margin: 0; font: 400 12px var(--font-sans); color: var(--mute); }
.coverage-badge {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	padding: 5px 10px;
	background: var(--bg-2);
	border: 1px solid var(--line);
	border-radius: 8px;
	font: 400 12px var(--font-sans);
	color: var(--dim);
}
.cov-sep { color: var(--mute); }
.coverage-badge strong { color: var(--fg-hi); font-weight: 600; }
.cross-loading { display: flex; flex-direction: column; }
.cross-empty {
	padding: 40px;
	text-align: center;
	font: 400 13px var(--font-sans);
	color: var(--mute);
}
.cross-row-grid {
	grid-template-columns: 80px 1fr 80px 90px 16px !important;
}
</style>
