<script setup lang="ts">
import ProjectTabs from '@/components/dashboard/ProjectTabs.vue';

definePageMeta({ layout: 'dashboard', middleware: 'auth' });
useHead({ title: 'Errors', titleTemplate: '%s | Pulsify' });

interface ErrorRow {
  id: string;
  plugin: string;
  message: string;
  stacktrace: string;
  level: string;
  count: number;
  firstSeenAt: string;
  lastSeenAt: string;
}
interface ErrorsResponse {
  errors: ErrorRow[];
  total: number;
}

const route = useRoute();
const slug = computed(() => route.params.slug as string);

const { data: projects } = await useProjects();
const project = computed(() => (projects.value ?? []).find(p => p.slug === slug.value) ?? null);

const { data, pending } = await useAsyncData<ErrorsResponse | null>(`project-errors-page-${slug.value}`, () =>
  project.value ? $fetch<ErrorsResponse>(`/api/v3/projects/${project.value.id}/errors`) : Promise.resolve(null),
);

function levelClass(level: string) {
  if (level === 'error' || level === 'fatal') return 'err';
  if (level === 'warning' || level === 'warn') return 'warn';
  return 'info';
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const expanded = ref<string | null>(null);
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
					<div>
						<h3>Issues</h3>
						<p>{{ data?.total ?? 0 }} total · across all nodes</p>
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
					No issues reported. Nice.
				</div>
				<template v-else>
					<div
						v-for="err in data.errors"
						:key="err.id"
						class="err-row"
						:class="{ expanded: expanded === err.id }"
						@click="expanded = expanded === err.id ? null : err.id"
					>
						<div class="err-main">
							<span class="lvl" :class="levelClass(err.level)">{{ err.level }}</span>
							<div class="err-msg">
								<div class="err-title">{{ err.message }}</div>
								<div class="err-meta">{{ err.plugin }} · first seen {{ relativeTime(err.firstSeenAt) }}</div>
							</div>
							<div class="err-count">
								{{ err.count.toLocaleString() }}
								<span class="sub">events</span>
							</div>
							<div class="err-when">{{ relativeTime(err.lastSeenAt) }}</div>
							<svg v-if="err.stacktrace" class="chevron" :class="{ open: expanded === err.id }" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
						</div>
						<div v-if="expanded === err.id && err.stacktrace" class="err-stack">
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
	padding: 18px 18px 12px;
	border-bottom: 1px solid var(--line);
}
.card-hd h3 { margin: 0 0 2px; font: 600 14.5px var(--font-sans); color: var(--fg-hi); }
.card-hd p  { margin: 0; font: 400 12.5px var(--font-sans); color: var(--mute); }

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

.err-main {
	display: grid;
	grid-template-columns: 80px 1fr 80px 90px 20px;
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
</style>
