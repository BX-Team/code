<script setup lang="ts">
export interface ProjectRow {
  id: string;
  name: string;
  slug: string;
  type: 'server' | 'plugin' | 'mod';
  lastSeenAt: string | null;
  software: string | null;
  mcVersion: string | null;
  errors: number;
}

defineProps<{
  data: ProjectRow[];
  loading?: boolean;
}>();

function relativeTime(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const statusLabel = projectStatus;
</script>

<template>
	<div class="px-4 lg:px-6">
		<div class="card">
			<div class="card-hd">
				<div>
					<h3 class="card-title">Projects</h3>
					<p class="card-sub">All your projects</p>
				</div>
			</div>
			<div class="tbl-wrap">
				<table class="tbl">
					<thead>
						<tr>
							<th>Name</th>
							<th>Type</th>
							<th>Status</th>
							<th>Software</th>
							<th>Last seen</th>
							<th style="text-align:right">Errors</th>
						</tr>
					</thead>
					<tbody>
						<template v-if="loading">
							<tr v-for="n in 4" :key="n">
								<td><span class="skeleton" /></td>
								<td><span class="skeleton" style="width:50px" /></td>
								<td><span class="skeleton" style="width:60px" /></td>
								<td><span class="skeleton" style="width:80px" /></td>
								<td><span class="skeleton" style="width:60px" /></td>
								<td><span class="skeleton" style="width:30px;margin-left:auto;display:block" /></td>
							</tr>
						</template>
						<tr
							v-for="row in data"
							:key="row.id"
							class="clickable"
							@click="navigateTo(`/dashboard/${row.slug}`)"
						>
							<td class="name-cell">
								<span class="name-inner">
									<span class="proj-dot" :class="statusLabel(row).cls" />
									<span class="proj-name">{{ row.name }}</span>
								</span>
							</td>
							<td><span class="type-badge">{{ row.type }}</span></td>
							<td>
								<span class="status-pill" :class="statusLabel(row).cls">
									<span class="d" />
									{{ statusLabel(row).label }}
								</span>
							</td>
							<td class="mono-cell">{{ row.software ?? '—' }}</td>
							<td class="mono-cell">{{ relativeTime(row.lastSeenAt) }}</td>
							<td class="num-cell" :style="{ color: row.errors > 0 ? 'var(--err)' : 'var(--dim)' }">
								{{ row.errors }}
							</td>
						</tr>
						<tr v-if="!loading && !data.length">
							<td colspan="6" class="empty">No projects yet. Create one to get started.</td>
						</tr>
					</tbody>
				</table>
			</div>
		</div>
	</div>
</template>

<style scoped>
.card {
	background: var(--bg-1);
	border: 1px solid var(--line);
	border-radius: 12px;
	overflow: hidden;
}
.card-hd {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	padding: 18px 18px 0;
}
.card-title { margin: 0 0 2px; font: 600 14.5px var(--font-sans); color: var(--fg-hi); }
.card-sub   { margin: 0; font: 400 12.5px var(--font-sans); color: var(--mute); }

.tbl-wrap { overflow-x: auto; margin-top: 14px; border-top: 1px solid var(--line); }

.tbl { width: 100%; border-collapse: collapse; }
.tbl thead th {
	text-align: left;
	padding: 10px 14px;
	font: 500 11px var(--font-mono);
	color: var(--mute);
	text-transform: uppercase;
	letter-spacing: .06em;
	border-bottom: 1px solid var(--line);
	white-space: nowrap;
	background: var(--bg-1);
}
.tbl tbody td {
	padding: 13px 14px;
	border-bottom: 1px solid var(--line);
	font: 400 13px var(--font-sans);
	color: var(--fg);
	vertical-align: middle;
}
.tbl tbody tr:last-child td { border-bottom: 0; }
.tbl tbody tr.clickable { cursor: pointer; }
.tbl tbody tr.clickable:hover { background: var(--bg-2); }

.name-inner {
	display: inline-flex;
	align-items: center;
	gap: 10px;
}
.proj-dot {
	width: 6px;
	height: 6px;
	border-radius: 50%;
	background: var(--ok);
	box-shadow: 0 0 6px color-mix(in oklab, var(--ok) 60%, transparent);
	flex-shrink: 0;
}
.proj-dot.warn  { background: var(--warn); box-shadow: 0 0 6px color-mix(in oklab, var(--warn) 60%, transparent); }
.proj-dot.muted { background: var(--mute); box-shadow: none; }

.proj-name { font: 500 13px var(--font-sans); color: var(--fg-hi); }

.type-badge {
	font: 500 11px var(--font-mono);
	padding: 2px 7px;
	background: var(--bg-3);
	border: 1px solid var(--line);
	border-radius: 4px;
	color: var(--dim);
	text-transform: capitalize;
}

.status-pill {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	font: 500 12px var(--font-sans);
	color: var(--dim);
}
.status-pill .d {
	width: 6px; height: 6px;
	border-radius: 50%;
	background: var(--ok);
	box-shadow: 0 0 5px var(--ok);
}
.status-pill.warn .d  { background: var(--warn); box-shadow: 0 0 5px var(--warn); }
.status-pill.muted .d { background: var(--mute); box-shadow: none; }

.mono-cell { font: 500 12px var(--font-mono); color: var(--dim); }
.num-cell  { font: 500 12px var(--font-mono); color: var(--dim); text-align: right; }

.skeleton {
	display: block;
	width: 100px;
	height: 14px;
	border-radius: 4px;
	background: var(--bg-3);
	animation: pulse 1.4s ease-in-out infinite;
}
@keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.4 } }

.empty {
	text-align: center;
	padding: 48px 14px;
	color: var(--mute);
	font: 400 13px var(--font-sans);
}
</style>
