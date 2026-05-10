<script setup lang="ts">
import { computed } from 'vue';
import type { Incident, ServiceWithStatus } from '../types';

const props = defineProps<{
  incidents: Incident[];
  services: ServiceWithStatus[];
}>();

const serviceMap = computed(() => new Map(props.services.map(s => [s.id, s.name])));

function formatDate(ms: number): string {
  return (
    new Date(ms).toLocaleString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: 'short',
      timeZone: 'UTC',
    }) + ' UTC'
  );
}

function incidentLabel(inc: Incident): string {
  if (inc.title) return inc.title;
  if (inc.type === 'maintenance') return 'Scheduled maintenance';
  const name = inc.service_id ? (serviceMap.value.get(inc.service_id) ?? inc.service_id) : 'System';
  return `${name} is down`;
}
</script>

<template>
	<div v-for="incident in incidents" :key="incident.id" class="banner" :class="incident.type">
		<div class="ic">
			<!-- maintenance icon -->
			<svg v-if="incident.type === 'maintenance'" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7">
				<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
			</svg>
			<!-- incident icon -->
			<svg v-else viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7">
				<path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.7 3.86a2 2 0 0 0-3.4 0Z" />
				<path d="M12 9v4M12 17h.01" />
			</svg>
		</div>
		<div>
			<div class="t">
				<span class="lvl">{{ incident.type }}</span>
				{{ incidentLabel(incident) }}
			</div>
			<div class="s">Since {{ formatDate(incident.started_at) }}</div>
		</div>
		<a class="more" href="#timeline">
			View details
			<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8">
				<path d="m9 18 6-6-6-6" />
			</svg>
		</a>
	</div>
</template>

<style scoped>
.banner {
	display: grid;
	grid-template-columns: auto 1fr auto;
	align-items: center;
	gap: 16px;
	padding: 14px 16px;
	border-radius: var(--r-lg);
	margin-bottom: 10px;
}

.banner.auto,
.banner.manual {
	background: color-mix(in oklab, var(--err) 10%, var(--bg-1));
	border: 1px solid color-mix(in oklab, var(--err) 35%, var(--line));
}

.banner.maintenance {
	background: color-mix(in oklab, var(--warn) 10%, var(--bg-1));
	border: 1px solid color-mix(in oklab, var(--warn) 35%, var(--line));
}

.banner.auto .ic,
.banner.manual .ic {
	color: var(--err);
	background: color-mix(in oklab, var(--err) 22%, transparent);
	border: 1px solid color-mix(in oklab, var(--err) 45%, transparent);
}

.banner.maintenance .ic {
	color: var(--warn);
	background: color-mix(in oklab, var(--warn) 22%, transparent);
	border: 1px solid color-mix(in oklab, var(--warn) 45%, transparent);
}

.ic {
	width: 36px;
	height: 36px;
	display: grid;
	place-items: center;
	border-radius: 8px;
}

.t {
	display: flex;
	align-items: center;
	gap: 10px;
	flex-wrap: wrap;
	font: 600 13.5px var(--font-sans);
	color: var(--fg-hi);
}

.lvl {
	font: 600 9.5px var(--font-mono);
	padding: 3px 7px;
	border-radius: 4px;
	letter-spacing: 0.05em;
	text-transform: uppercase;
}

.banner.auto .lvl,
.banner.manual .lvl {
	background: color-mix(in oklab, var(--err) 22%, transparent);
	color: var(--err);
	border: 1px solid color-mix(in oklab, var(--err) 50%, transparent);
}

.banner.maintenance .lvl {
	background: color-mix(in oklab, var(--warn) 22%, transparent);
	color: var(--warn);
	border: 1px solid color-mix(in oklab, var(--warn) 50%, transparent);
}

.s {
	font: 400 12.5px var(--font-sans);
	color: var(--dim);
	margin-top: 3px;
}

.more {
	font: 500 12.5px var(--font-sans);
	color: var(--fg-hi);
	display: inline-flex;
	align-items: center;
	gap: 6px;
	padding: 7px 12px;
	border: 1px solid var(--line);
	border-radius: var(--r-full);
	background: var(--bg-1);
}

.more:hover {
	border-color: var(--line-2);
}
</style>
