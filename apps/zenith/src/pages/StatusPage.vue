<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import AppNav from '../components/AppNav.vue';
import FilterTabs from '../components/FilterTabs.vue';
import IncidentBanner from '../components/IncidentBanner.vue';
import IncidentTimeline from '../components/IncidentTimeline.vue';
import ServiceGroup from '../components/ServiceGroup.vue';
import StatusHero from '../components/StatusHero.vue';
import type { HistoryResponse, IncidentsResponse, StatusResponse } from '../types';

const status = ref<StatusResponse | null>(null);
const history = ref<HistoryResponse['history']>({});
const incidents = ref<IncidentsResponse['incidents']>([]);
const loading = ref(true);
const activeFilter = ref('');
let refreshTimer: ReturnType<typeof setInterval> | null = null;

async function fetchAll() {
  const [s, h, inc] = await Promise.all([
    fetch('/api/status').then(r => r.json() as Promise<StatusResponse>),
    fetch('/api/history').then(r => r.json() as Promise<HistoryResponse>),
    fetch('/api/incidents?days=7').then(r => r.json() as Promise<IncidentsResponse>),
  ]);
  status.value = s;
  history.value = h.history;
  incidents.value = inc.incidents;
  loading.value = false;
}

onMounted(() => {
  fetchAll();
  refreshTimer = setInterval(fetchAll, 30_000);
});

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer);
});

const groups = computed(() => status.value?.groupOrder ?? []);

const filteredGroups = computed(() => {
  if (!status.value) return [];
  const all = groups.value;
  if (!activeFilter.value) return all;
  return all.filter(g => g === activeFilter.value);
});

function servicesInGroup(group: string) {
  return status.value?.services.filter(s => s.group_name === group) ?? [];
}
</script>

<template>
	<div>
		<AppNav />
		<div class="z-shell">
			<div v-if="loading" class="loading">Loading…</div>

			<template v-if="status">
				<StatusHero :services="status.services" :active-incidents="status.activeIncidents" :updated-at="status.updatedAt" />

				<IncidentBanner
					v-if="status.activeIncidents.length > 0"
					:incidents="status.activeIncidents"
					:services="status.services"
				/>

				<FilterTabs
					v-model="activeFilter"
					:groups="groups"
				/>

				<div id="services">
					<ServiceGroup
						v-for="group in filteredGroups"
						:key="group"
						:group-name="group"
						:services="servicesInGroup(group)"
						:history="history"
					/>
				</div>

				<IncidentTimeline :incidents="incidents" />

				<footer class="foot">
					<div class="legal">
						<span>© {{ new Date().getFullYear() }} BX Team</span>
					</div>
				</footer>
			</template>
		</div>
	</div>
</template>

<style scoped>
.loading {
	margin-top: 80px;
	text-align: center;
	font: 400 14px var(--font-mono);
	color: var(--mute);
}

.subscribe {
	margin-top: 36px;
	padding: 22px 24px;
	background: var(--bg-1);
	border: 1px solid var(--line);
	border-radius: var(--r-lg);
	display: grid;
	grid-template-columns: 1fr auto;
	align-items: center;
	gap: 20px;
}

.subscribe h3 {
	margin: 0 0 4px;
	font: 600 15px var(--font-sans);
	color: var(--fg-hi);
}

.subscribe p {
	margin: 0;
	font: 400 13px var(--font-sans);
	color: var(--dim);
}

.btn-row {
	display: inline-flex;
	gap: 8px;
}

.btn {
	display: inline-flex;
	align-items: center;
	gap: 7px;
	padding: 8px 14px;
	font: 500 12.5px var(--font-sans);
	border-radius: var(--r-full);
	border: 1px solid var(--line);
	background: var(--bg-2);
	color: var(--fg-hi);
}

.btn:hover {
	border-color: var(--line-2);
}

.btn.primary {
	background: var(--brand);
	color: var(--bg-0);
	border-color: var(--brand);
	font-weight: 600;
}

.btn.primary:hover {
	box-shadow: 0 0 0 3px var(--brand-soft);
}

.foot {
	margin-top: 48px;
	padding: 22px 4px 0;
	border-top: 1px solid var(--line);
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16px;
	font: 400 12px var(--font-sans);
	color: var(--mute);
}

.foot .legal {
	display: flex;
	align-items: center;
	gap: 8px;
}

.foot a:hover {
	color: var(--fg-hi);
}

.foot .right {
	display: inline-flex;
	align-items: center;
	gap: 16px;
}

.dotsep {
	color: var(--line-2);
}

@media (max-width: 760px) {
	.subscribe {
		grid-template-columns: 1fr;
	}
}
</style>
