<script setup lang="ts">
import { computed } from 'vue';
import type { ServiceWithStatus, UptimeDay } from '../types';
import ServiceRow from './ServiceRow.vue';

const props = defineProps<{
  groupName: string;
  services: ServiceWithStatus[];
  history: Record<string, UptimeDay[]>;
}>();

const allUp = computed(() => props.services.every(s => !s.status || s.status.is_up === 1));
const anyWarn = computed(() =>
  props.services.some(s => s.status && s.status.consecutive_failures > 0 && s.status.is_up === 1),
);
</script>

<template>
	<section class="group">
		<header class="group-h">
			<span class="ic">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
					<circle cx="12" cy="12" r="9" />
					<path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
				</svg>
			</span>
			<h2>{{ groupName }}</h2>
			<span class="cnt">{{ services.length }} services</span>
			<span class="all-up" :class="{ warn: !allUp || anyWarn }">
				<span class="d" />
				{{ allUp ? 'All up' : 'Issues detected' }}
			</span>
		</header>

		<div class="group-card">
			<div class="scale">
				<span>90 days ago</span>
				<div class="right">
					<span class="it"><span class="sw" style="background: var(--brand-2)" /> Operational</span>
					<span class="it"><span class="sw" style="background: var(--warn)" /> Degraded</span>
					<span class="it"><span class="sw" style="background: var(--err)" /> Outage</span>
					<span class="it"><span class="sw" style="background: var(--bg-3); border: 1px solid var(--line)" /> No data</span>
				</div>
				<span>Today</span>
			</div>

			<ServiceRow
				v-for="service in services"
				:key="service.id"
				:service="service"
				:history="history[service.id] ?? []"
			/>
		</div>
	</section>
</template>

<style scoped>
.group {
	margin-bottom: 22px;
}

.group-h {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 0 4px 10px;
}

.ic {
	width: 26px;
	height: 26px;
	border-radius: 7px;
	background: var(--bg-1);
	border: 1px solid var(--line);
	display: grid;
	place-items: center;
	color: var(--dim);
}

.ic svg {
	width: 13px;
	height: 13px;
}

h2 {
	margin: 0;
	font: 600 15px var(--font-sans);
	color: var(--fg-hi);
	letter-spacing: -0.005em;
}

.cnt {
	font: 500 11px var(--font-mono);
	color: var(--mute);
	letter-spacing: 0.04em;
}

.all-up {
	margin-left: auto;
	display: inline-flex;
	align-items: center;
	gap: 6px;
	font: 500 12px var(--font-sans);
	color: var(--brand-2);
}

.all-up .d {
	width: 6px;
	height: 6px;
	border-radius: 50%;
	background: var(--brand-2);
	box-shadow: 0 0 6px var(--brand-2);
}

.all-up.warn {
	color: var(--warn);
}

.all-up.warn .d {
	background: var(--warn);
	box-shadow: 0 0 6px var(--warn);
}

.group-card {
	background: var(--bg-1);
	border: 1px solid var(--line);
	border-radius: var(--r-lg);
	overflow: hidden;
}

.scale {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 12px 20px 10px;
	background: var(--bg-1);
	border-bottom: 1px solid var(--line);
	font: 500 11px var(--font-mono);
	color: var(--mute);
	letter-spacing: 0.04em;
	text-transform: uppercase;
}

.right {
	display: inline-flex;
	align-items: center;
	gap: 16px;
	text-transform: none;
	letter-spacing: 0;
}

.it {
	display: inline-flex;
	align-items: center;
	gap: 6px;
}

.sw {
	width: 8px;
	height: 8px;
	border-radius: 2px;
	display: inline-block;
}

@media (max-width: 760px) {
	.scale {
		display: none;
	}
}
</style>
