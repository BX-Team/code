<script setup lang="ts">
import { computed } from 'vue';
import type { Incident } from '../types';

const props = defineProps<{
  incidents: Incident[];
}>();

interface DayGroup {
  label: string;
  dateStr: string;
  incidents: Incident[];
  allGreen: boolean;
}

const groups = computed((): DayGroup[] => {
  const byDay = new Map<string, Incident[]>();

  for (const inc of props.incidents) {
    const date = new Date(inc.started_at).toISOString().slice(0, 10);
    if (!byDay.has(date)) byDay.set(date, []);
    byDay.get(date)!.push(inc);
  }

  const result: DayGroup[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(Date.now() - i * 86400000);
    const dateStr = d.toISOString().slice(0, 10);
    const label = i === 0 ? 'Today' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const dayIncidents = byDay.get(dateStr) ?? [];
    result.push({ label, dateStr, incidents: dayIncidents, allGreen: dayIncidents.length === 0 });
  }

  return result;
});

function formatTime(ms: number): string {
  return (
    new Date(ms).toLocaleString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
    }) + ' UTC'
  );
}

function duration(inc: Incident): string {
  if (!inc.resolved_at) return 'ongoing';
  const min = Math.round((inc.resolved_at - inc.started_at) / 60_000);
  if (min < 1) return 'less than a minute';
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)}h ${min % 60}min`;
}

function incidentTitle(inc: Incident): string {
  if (inc.title) return inc.title;
  if (inc.type === 'maintenance') return 'Scheduled maintenance';
  return inc.service_name ?? inc.service_id ?? 'System';
}

function isMaintenance(inc: Incident): boolean {
  return inc.type === 'maintenance';
}
</script>

<template>
	<section class="timeline" id="timeline">
		<div class="timeline-h">
			<h2>Past incidents</h2>
			<span class="sub">Last 7 days</span>
		</div>

		<div v-for="group in groups" :key="group.dateStr" class="day">
			<div class="day-h">
				<span class="date">{{ group.label }}</span>
				<span v-if="!group.allGreen" class="day-sub">
					{{ group.incidents.some((i) => !i.resolved_at) ? 'in progress' : `resolved · ${duration(group.incidents[0])}` }}
				</span>
				<span v-else class="day-sub">all green</span>
				<span
					class="badge-i"
					:class="group.allGreen ? 'ok' : group.incidents.some((i) => !i.resolved_at) ? 'warn' : 'err'"
				>
					{{ group.allGreen ? 'No incidents' : `${group.incidents.length} incident${group.incidents.length > 1 ? 's' : ''}` }}
				</span>
				<span v-if="group.allGreen" class="all-ok">↗ Normal traffic</span>
			</div>

			<div v-for="inc in group.incidents" :key="inc.id" class="incident">
				<div class="title">
					{{ incidentTitle(inc) }}
					<span class="target type-badge" :class="inc.type">{{ inc.type }}</span>
					<span v-if="inc.service_id && inc.type !== 'maintenance'" class="target">{{ inc.service_id }}</span>
				</div>
				<div class="updates">
					<div v-if="inc.resolved_at" class="update">
						<span class="when">{{ formatTime(inc.resolved_at) }}</span>
						<span class="lvl-i resolved">resolved</span>
						<span class="body">
							<strong>Resolved.</strong>
							{{ isMaintenance(inc) ? 'Maintenance completed after' : 'Service restored after' }}
							{{ duration(inc) }}.
						</span>
					</div>
					<div class="update">
						<span class="when">{{ formatTime(inc.started_at) }}</span>
						<span class="lvl-i" :class="isMaintenance(inc) ? 'maint' : (inc.resolved_at ? 'identified' : 'investigating')">
							{{ isMaintenance(inc) ? 'maintenance' : (inc.resolved_at ? 'identified' : 'investigating') }}
						</span>
						<span class="body">
							<strong>{{ isMaintenance(inc) ? 'Maintenance.' : (inc.resolved_at ? 'Down.' : 'Investigating.') }}</strong>
							{{ isMaintenance(inc)
								? (inc.title ?? 'Scheduled maintenance in progress.')
								: `Service ${inc.service_name ?? inc.service_id ?? ''} became unavailable.` }}
						</span>
					</div>
				</div>
			</div>
		</div>
	</section>
</template>

<style scoped>
.timeline {
	margin-top: 36px;
}

.timeline-h {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 14px;
	padding: 0 4px;
}

.timeline-h h2 {
	margin: 0;
	font: 600 16px var(--font-sans);
	color: var(--fg-hi);
	letter-spacing: -0.01em;
}

.timeline-h .sub {
	font: 400 12.5px var(--font-sans);
	color: var(--mute);
}

.day {
	padding: 18px 20px;
	background: var(--bg-1);
	border: 1px solid var(--line);
	border-radius: var(--r-lg);
	margin-bottom: 10px;
}

.day-h {
	display: flex;
	align-items: center;
	gap: 12px;
}

.date {
	font: 600 13px var(--font-sans);
	color: var(--fg-hi);
}

.day-sub {
	font: 400 12px var(--font-mono);
	color: var(--mute);
}

.all-ok {
	margin-left: auto;
	font: 500 12px var(--font-sans);
	color: var(--mute);
}

.badge-i {
	font: 600 10px var(--font-mono);
	padding: 2px 7px;
	border-radius: 4px;
	letter-spacing: 0.04em;
	text-transform: uppercase;
}

.badge-i.warn {
	color: var(--warn);
	background: color-mix(in oklab, var(--warn) 18%, transparent);
	border: 1px solid color-mix(in oklab, var(--warn) 40%, transparent);
}

.badge-i.err {
	color: var(--err);
	background: color-mix(in oklab, var(--err) 18%, transparent);
	border: 1px solid color-mix(in oklab, var(--err) 40%, transparent);
}

.badge-i.ok {
	color: var(--brand-2);
	background: color-mix(in oklab, var(--brand-2) 14%, transparent);
	border: 1px solid color-mix(in oklab, var(--brand-2) 35%, transparent);
}

.incident {
	margin-top: 14px;
	padding-top: 14px;
	border-top: 1px solid var(--line);
}

.title {
	display: flex;
	align-items: center;
	gap: 10px;
	flex-wrap: wrap;
	font: 600 13.5px var(--font-sans);
	color: var(--fg-hi);
}

.target {
	font: 500 12px var(--font-mono);
	color: var(--dim);
}

.type-badge {
	font: 600 9px var(--font-mono);
	padding: 2px 6px;
	border-radius: 3px;
	letter-spacing: 0.05em;
	text-transform: uppercase;
}

.type-badge.auto,
.type-badge.manual {
	color: var(--err);
	background: color-mix(in oklab, var(--err) 14%, transparent);
	border: 1px solid color-mix(in oklab, var(--err) 30%, transparent);
}

.type-badge.maintenance {
	color: var(--warn);
	background: color-mix(in oklab, var(--warn) 14%, transparent);
	border: 1px solid color-mix(in oklab, var(--warn) 30%, transparent);
}

.updates {
	margin-top: 10px;
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.update {
	display: grid;
	grid-template-columns: 80px auto 1fr;
	gap: 12px;
	align-items: baseline;
	font: 400 12.5px var(--font-sans);
	color: var(--dim);
}

.when {
	font: 500 11.5px var(--font-mono);
	color: var(--mute);
}

.lvl-i {
	font: 600 9.5px var(--font-mono);
	padding: 2px 6px;
	border-radius: 3px;
	letter-spacing: 0.05em;
	text-transform: uppercase;
	text-align: center;
	width: 88px;
}

.lvl-i.resolved {
	color: var(--brand-2);
	background: color-mix(in oklab, var(--brand-2) 14%, transparent);
	border: 1px solid color-mix(in oklab, var(--brand-2) 35%, transparent);
}

.lvl-i.identified {
	color: var(--warn);
	background: color-mix(in oklab, var(--warn) 16%, transparent);
	border: 1px solid color-mix(in oklab, var(--warn) 40%, transparent);
}

.lvl-i.investigating {
	color: var(--err);
	background: color-mix(in oklab, var(--err) 16%, transparent);
	border: 1px solid color-mix(in oklab, var(--err) 40%, transparent);
}

.lvl-i.maint {
	color: var(--warn);
	background: color-mix(in oklab, var(--warn) 16%, transparent);
	border: 1px solid color-mix(in oklab, var(--warn) 40%, transparent);
}

.body strong {
	color: var(--fg-hi);
	font-weight: 500;
}
</style>
