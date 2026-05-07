<script setup lang="ts">
interface Trend {
  direction: 'up' | 'down';
  value: string;
}

interface Stat {
  label: string;
  value: string | number;
  caption?: string;
  hint?: string;
  trend?: Trend;
}

defineProps<{
  stats: Stat[];
  loading?: boolean;
}>();
</script>

<template>
	<div class="kpis px-4 lg:px-6">
		<div v-for="stat in stats" :key="stat.label" class="kpi">
			<div class="kpi-l">
				<span class="kpi-label">{{ stat.label }}</span>
				<span v-if="stat.trend" class="kpi-trend" :class="stat.trend.direction">
					{{ stat.trend.direction === 'up' ? '↗' : '↘' }} {{ stat.trend.value }}
				</span>
			</div>
			<div class="kpi-v">
				<span v-if="loading" class="skeleton" />
				<template v-else>{{ stat.value }}</template>
			</div>
			<div v-if="stat.caption" class="kpi-d">{{ stat.caption }}</div>
			<div v-if="stat.hint" class="kpi-sub">{{ stat.hint }}</div>
		</div>
	</div>
</template>

<style scoped>
.kpis {
	display: grid;
	grid-template-columns: repeat(4, 1fr);
	gap: 14px;
}
@media (max-width: 900px) { .kpis { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 520px) { .kpis { grid-template-columns: 1fr; } }

.kpi {
	background: var(--bg-1);
	border: 1px solid var(--line);
	border-radius: 12px;
	padding: 18px 18px 16px;
}

.kpi-l {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 8px;
}
.kpi-label { font: 500 12.5px var(--font-sans); color: var(--dim); }

.kpi-trend {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	padding: 2px 7px;
	border-radius: 9999px;
	border: 1px solid var(--line);
	font: 500 11px var(--font-mono);
	background: var(--bg-2);
	color: var(--fg-hi);
}
.kpi-trend.up   { color: var(--brand-2); border-color: color-mix(in oklab, var(--brand-2) 40%, var(--line)); }
.kpi-trend.down { color: var(--err);     border-color: color-mix(in oklab, var(--err) 40%, var(--line)); }

.kpi-v {
	font: 600 28px var(--font-sans);
	color: var(--fg-hi);
	letter-spacing: -0.02em;
	line-height: 1.1;
	min-height: 34px;
}

.skeleton {
	display: block;
	width: 80px;
	height: 28px;
	border-radius: 6px;
	background: var(--bg-3);
	animation: pulse 1.4s ease-in-out infinite;
}
@keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.4 } }

.kpi-d {
	margin-top: 8px;
	font: 500 12px var(--font-sans);
	color: var(--fg-hi);
}
.kpi-sub { margin-top: 2px; font: 400 11.5px var(--font-sans); color: var(--mute); }
</style>
