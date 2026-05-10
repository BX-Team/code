<script setup lang="ts">
import { computed } from 'vue';
import type { Incident, ServiceWithStatus } from '../types';

const props = defineProps<{
  services: ServiceWithStatus[];
  activeIncidents: Incident[];
  updatedAt: number;
}>();

const allUp = computed(() => props.services.every(s => !s.status || s.status.is_up === 1));
const hasMaintenance = computed(() => props.activeIncidents.some(i => i.type === 'maintenance'));
const hasOutage = computed(() => !allUp.value || props.activeIncidents.some(i => i.type === 'manual'));

function formatUpdated(ms: number): string {
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
</script>

<template>
	<section class="head">
		<span class="eyebrow-row">
			<span class="d" :class="hasOutage ? 'err' : hasMaintenance ? 'warn' : ''" />
			{{ hasOutage ? 'Some systems degraded' : hasMaintenance ? 'Maintenance in progress' : 'All systems operational' }}
		</span>
		<h1 v-if="!hasOutage && !hasMaintenance">Everything is <em>running</em>.<br />No incidents reported.</h1>
		<h1 v-else-if="hasMaintenance && !hasOutage">Scheduled <em class="maint">maintenance</em>.<br />Services may be affected.</h1>
		<h1 v-else>Some services are <em class="err">down</em>.<br />Incident in progress.</h1>
		<div class="meta">
			<span class="live">
				<span class="d" />
				Live · checks every 60s
			</span>
			<span class="dotsep">·</span>
			<span>Last updated <code>{{ formatUpdated(updatedAt) }}</code></span>
			<span class="dotsep">·</span>
			<span>Services <code>{{ services.length }}</code></span>
		</div>
	</section>
</template>

<style scoped>
.head {
	margin: 56px 0 28px;
}

.eyebrow-row {
	display: inline-flex;
	align-items: center;
	gap: 8px;
	padding: 5px 11px 5px 9px;
	background: var(--bg-1);
	border: 1px solid var(--line);
	border-radius: var(--r-full);
	font: 500 11.5px var(--font-mono);
	color: var(--dim);
	letter-spacing: 0.02em;
}

.d {
	width: 7px;
	height: 7px;
	border-radius: 50%;
	background: var(--ok);
	box-shadow: 0 0 0 4px color-mix(in oklab, var(--ok) 18%, transparent), 0 0 8px var(--ok);
	animation: pulse 2.4s ease-in-out infinite;
}

.d.warn {
	background: var(--warn);
	box-shadow: 0 0 0 4px color-mix(in oklab, var(--warn) 18%, transparent), 0 0 8px var(--warn);
}

.d.err {
	background: var(--err);
	box-shadow: 0 0 0 4px color-mix(in oklab, var(--err) 18%, transparent), 0 0 8px var(--err);
}

@keyframes pulse {
	0%, 100% {
		box-shadow: 0 0 0 4px color-mix(in oklab, var(--ok) 18%, transparent), 0 0 8px var(--ok);
	}
	50% {
		box-shadow: 0 0 0 7px color-mix(in oklab, var(--ok) 6%, transparent), 0 0 12px var(--ok);
	}
}

h1 {
	margin: 18px 0 10px;
	font: 700 44px var(--font-sans);
	letter-spacing: -0.025em;
	color: var(--fg-hi);
	line-height: 1.05;
}

h1 em {
	font-style: normal;
	background: linear-gradient(90deg, var(--brand) 0%, var(--brand-2) 100%);
	-webkit-background-clip: text;
	background-clip: text;
	color: transparent;
}

h1 em.err {
	background: none;
	-webkit-background-clip: unset;
	background-clip: unset;
	color: var(--err);
}

h1 em.maint {
	background: none;
	-webkit-background-clip: unset;
	background-clip: unset;
	color: var(--warn);
}

.meta {
	display: flex;
	align-items: center;
	gap: 14px;
	flex-wrap: wrap;
	font: 400 13px var(--font-sans);
	color: var(--mute);
}

.dotsep {
	color: var(--line-2);
}

.meta code {
	font: 500 12px var(--font-mono);
	color: var(--dim);
	background: var(--bg-1);
	border: 1px solid var(--line);
	padding: 2px 7px;
	border-radius: var(--r-xs);
}

.live {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	color: var(--brand-2);
}

.live .d {
	width: 6px;
	height: 6px;
	border-radius: 50%;
	background: var(--brand-2);
	box-shadow: 0 0 6px var(--brand-2);
	animation: none;
}

@media (max-width: 760px) {
	h1 {
		font-size: 32px;
	}
}
</style>
