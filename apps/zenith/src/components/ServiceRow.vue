<script setup lang="ts">
import { computed } from 'vue';
import type { ServiceWithStatus, UptimeDay } from '../types';
import UptimeBar from './UptimeBar.vue';

const props = defineProps<{
  service: ServiceWithStatus;
  history: UptimeDay[];
}>();

const DB_LABELS: Record<string, string> = {
  postgres: 'PG',
  postgresql: 'PG',
  clickhouse: 'CH',
  mysql: 'MY',
  redis: 'RD',
  mongodb: 'MG',
};

const dotClass = computed(() => {
  const st = props.service.status;
  if (!st) return 'idle';
  if (st.is_up === 0) return 'err';
  if (st.consecutive_failures > 0) return 'warn';
  return '';
});

const uptime = computed(() => {
  if (props.history.length === 0) return '—';
  const total = props.history.reduce((a, d) => a + d.checks_total, 0);
  const ok = props.history.reduce((a, d) => a + d.checks_ok, 0);
  if (total === 0) return '—';
  return ((ok / total) * 100).toFixed(3) + '%';
});

const badge = computed(() => {
  if (props.service.type === 'db') {
    const dt = props.service.db_type?.toLowerCase() ?? '';
    return DB_LABELS[dt] ?? 'DB';
  }
  return props.service.type.toUpperCase();
});

const metaText = computed(() => {
  const s = props.service;
  if (s.type === 'http') return `${s.method} ${s.url ?? ''} · expect ${s.expected_status}`;
  if (s.type === 'db') {
    const label = s.db_type ?? 'Database';
    return `${label} · ${s.url ?? 'push heartbeat'} · interval ${Math.round(s.push_interval_ms / 1000)}s`;
  }
  const interval = Math.round(s.push_interval_ms / 1000);
  return `push heartbeat · interval ${interval}s`;
});
</script>

<template>
	<div class="svc">
		<span class="svc-dot" :class="dotClass" />
		<div class="svc-name">
			<div class="top">
				{{ service.name }}
				<span class="badge mono" :class="service.type === 'db' ? 'badge-db' : ''">{{ badge }}</span>
			</div>
			<div class="meta">{{ metaText }}</div>
		</div>
		<div class="svc-bar">
			<UptimeBar :history="history" />
		</div>
		<div class="svc-stats">
			<div class="pct">{{ uptime }}</div>
		</div>
	</div>
</template>

<style scoped>
.svc {
	display: grid;
	grid-template-columns: 22px minmax(180px, 1fr) auto auto;
	align-items: center;
	gap: 18px;
	padding: 16px 20px;
	border-bottom: 1px solid var(--line);
	cursor: pointer;
	transition: background 0.15s;
}

.svc:last-child {
	border-bottom: 0;
}

.svc:hover {
	background: var(--bg-2);
}

.svc-dot {
	position: relative;
	width: 10px;
	height: 10px;
	border-radius: 50%;
	background: var(--ok);
	box-shadow: 0 0 0 4px color-mix(in oklab, var(--ok) 14%, transparent), 0 0 8px var(--ok);
}

.svc-dot.warn {
	background: var(--warn);
	box-shadow: 0 0 0 4px color-mix(in oklab, var(--warn) 14%, transparent), 0 0 8px var(--warn);
}

.svc-dot.err {
	background: var(--err);
	box-shadow: 0 0 0 4px color-mix(in oklab, var(--err) 14%, transparent), 0 0 8px var(--err);
}

.svc-dot.idle {
	background: var(--mute);
	box-shadow: none;
}

.svc-name {
	display: flex;
	flex-direction: column;
	gap: 3px;
	min-width: 0;
}

.top {
	display: flex;
	align-items: center;
	gap: 8px;
	font: 600 14px var(--font-sans);
	color: var(--fg-hi);
}

.badge.mono {
	font: 500 10px var(--font-mono);
	padding: 2px 6px;
	border-radius: 4px;
	background: var(--bg-3);
	border: 1px solid var(--line);
	color: var(--dim);
	letter-spacing: 0.04em;
}

.badge-db {
	background: color-mix(in oklab, var(--brand) 14%, var(--bg-3));
	border-color: color-mix(in oklab, var(--brand) 30%, var(--line));
	color: var(--brand);
}

.meta {
	font: 400 12px var(--font-mono);
	color: var(--mute);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	max-width: 340px;
}

.svc-stats {
	display: flex;
	flex-direction: column;
	align-items: flex-end;
	gap: 2px;
	min-width: 78px;
}

.pct {
	font: 600 13.5px var(--font-mono);
	color: var(--fg-hi);
	letter-spacing: -0.01em;
}


@media (max-width: 760px) {
	.svc {
		grid-template-columns: 18px 1fr auto;
		gap: 8px 12px;
	}

	.svc-bar {
		display: none;
	}
}
</style>
