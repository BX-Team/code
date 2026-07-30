<script setup lang="ts">
import ProjectTabs from '@/components/dashboard/ProjectTabs.vue';
import { api } from '@/lib/api';

definePageMeta({ layout: 'dashboard', middleware: 'auth' });
useHead({ title: 'Metrics', titleTemplate: '%s | Pulsify' });

interface MetricSummary {
  name: string;
  totalPoints: number;
  maxValue: number;
  minValue: number;
  avgValue: number;
  lastSeenAt: string;
}
interface MetricsListResponse {
  metrics: MetricSummary[];
  range: '24h' | '7d' | '30d';
}
interface SeriesPoint {
  time: string;
  avg: number;
  max: number;
  min: number;
  count: number;
}
interface LabelBreakdown {
  key: string;
  values: Array<{ value: string; total: number; count: number }>;
}
interface MetricSeriesResponse {
  name: string;
  range: '24h' | '7d' | '30d';
  series: SeriesPoint[];
  labels: LabelBreakdown[];
}

const route = useRoute();
const slug = computed(() => route.params.slug as string);
const { data: projects } = await useProjects();
const project = computed(() => (projects.value ?? []).find(p => p.slug === slug.value) ?? null);

const range = ref<'24h' | '7d' | '30d'>('7d');
const selectedMetric = ref<string | null>(null);
const chartType = ref<'line' | 'bar' | 'pie'>('line');
const selectedLabel = ref<string | null>(null);

const chartTypeOptions = [
  { value: 'line', label: 'Line' },
  { value: 'bar', label: 'Bar' },
  { value: 'pie', label: 'Pie' },
] as const;

const PALETTE = ['#6366f1', '#22c55e', '#f59e0b', '#ec4899', '#06b6d4', '#a855f7', '#ef4444', '#84cc16'];

const {
  data: metricsData,
  pending: metricsPending,
  refresh: refreshMetrics,
} = await useAsyncData<MetricsListResponse | null>(
  `metrics-list-${slug.value}`,
  () =>
    project.value
      ? api<MetricsListResponse>(`/pulsify/projects/${project.value.id}/metrics`, {
          query: { range: range.value },
        })
      : Promise.resolve(null),
  { watch: [range, project] },
);

watch(metricsData, d => {
  if (d?.metrics.length && !selectedMetric.value) {
    selectedMetric.value = d.metrics[0]?.name ?? null;
  }
});

const { data: seriesData, pending: seriesPending } = await useAsyncData<MetricSeriesResponse | null>(
  `metrics-series-${slug.value}`,
  () =>
    project.value && selectedMetric.value
      ? api<MetricSeriesResponse>(
          `/pulsify/projects/${project.value.id}/metrics/${encodeURIComponent(selectedMetric.value)}`,
          { query: { range: range.value } },
        )
      : Promise.resolve(null),
  { watch: [selectedMetric, range, project] },
);

function formatNum(n: number) {
  if (n === Math.floor(n)) return n.toLocaleString();
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

const rangeOptions = [
  { value: '24h', label: '24h' },
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
] as const;

// Simple SVG sparkline from series data
const sparkPath = computed(() => {
  const pts = seriesData.value?.series ?? [];
  if (pts.length < 2) return '';
  const vals = pts.map(p => p.avg);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const w = 480;
  const h = 120;
  const points = pts.map((p, i) => {
    const x = (i / (pts.length - 1)) * w;
    const y = h - ((p.avg - min) / range) * h * 0.9 - h * 0.05;
    return `${x},${y}`;
  });
  return `M ${points.join(' L ')}`;
});

const currentMetricSummary = computed(
  () => metricsData.value?.metrics.find(m => m.name === selectedMetric.value) ?? null,
);

watch(selectedMetric, () => {
  selectedLabel.value = null;
});

const labelKeys = computed(() => seriesData.value?.labels.map(l => l.key) ?? []);

watch(seriesData, d => {
  const keys = d?.labels.map(l => l.key) ?? [];
  if (keys.length && (!selectedLabel.value || !keys.includes(selectedLabel.value))) {
    selectedLabel.value = keys[0] ?? null;
  } else if (!keys.length) {
    selectedLabel.value = null;
  }
});

const currentBreakdown = computed(() => {
  const all = seriesData.value?.labels.find(l => l.key === selectedLabel.value)?.values ?? [];
  return all.slice(0, 8);
});
const breakdownMax = computed(() => Math.max(...currentBreakdown.value.map(v => v.total), 1));
const breakdownTotal = computed(() => currentBreakdown.value.reduce((s, v) => s + v.total, 0) || 1);

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

const pieSlices = computed(() => {
  const items = currentBreakdown.value;
  const total = items.reduce((s, v) => s + v.total, 0) || 1;
  let angle = -90;
  return items.map((it, i) => {
    const frac = it.total / total;
    const start = angle;
    const end = angle + frac * 360;
    angle = end;
    const s = polar(50, 50, 46, end);
    const e = polar(50, 50, 46, start);
    const large = end - start <= 180 ? 0 : 1;
    return {
      ...it,
      path: `M 50 50 L ${s.x.toFixed(2)} ${s.y.toFixed(2)} A 46 46 0 ${large} 0 ${e.x.toFixed(2)} ${e.y.toFixed(2)} Z`,
      color: PALETTE[i % PALETTE.length],
      pct: frac * 100,
    };
  });
});
</script>

<template>
	<div v-if="!project" class="px-4 lg:px-6">
		<div class="not-found">Project not found.</div>
	</div>
	<template v-else-if="project.type === 'server'">
		<div class="px-4 lg:px-6">
			<div class="not-found">Metrics are only available for plugin and mod projects.</div>
		</div>
	</template>
	<template v-else>
		<ProjectTabs :slug="project.slug" :project-type="project.type" />

		<div class="metrics-wrap px-4 lg:px-6">
			<div class="page-hd">
				<div class="page-hd-l">
					<h2>Custom Metrics</h2>
					<p class="sdk-note">Values reported by your plugin via <code>client.metric(...)</code></p>
				</div>
				<div class="range-seg">
					<button
						v-for="opt in rangeOptions"
						:key="opt.value"
						class="seg"
						:class="{ active: range === opt.value }"
						@click="range = opt.value"
					>{{ opt.label }}</button>
				</div>
			</div>

			<div class="metrics-layout">
				<!-- Left: metric list -->
				<div class="metric-list-col">
					<div class="card metric-list-card">
						<div class="list-hd">Metrics</div>
						<div v-if="metricsPending" class="list-loading">
							<div v-for="n in 4" :key="n" class="list-row-sk">
								<span class="sk" style="width:60%;height:13px" />
								<span class="sk" style="width:30%;height:11px" />
							</div>
						</div>
						<div v-else-if="!metricsData?.metrics.length" class="list-empty">
							No metrics yet. Use <code>client.metric(name, value)</code> in your plugin.
						</div>
						<button
							v-for="m in metricsData?.metrics"
							:key="m.name"
							class="metric-row"
							:class="{ active: selectedMetric === m.name }"
							@click="selectedMetric = m.name"
						>
							<div class="metric-name">{{ m.name }}</div>
							<div class="metric-pts">{{ m.totalPoints.toLocaleString() }} pts</div>
						</button>
					</div>
				</div>

				<!-- Right: chart + summary -->
				<div class="metric-detail-col">
					<div v-if="!selectedMetric || !metricsData?.metrics.length" class="card detail-empty">
						<p>Select a metric to view its time series.</p>
					</div>
					<template v-else>
						<!-- Summary cards -->
						<div class="summary-row">
							<div class="card stat-card">
								<div class="stat-lbl">Avg</div>
								<div class="stat-val">{{ currentMetricSummary ? formatNum(currentMetricSummary.avgValue) : '—' }}</div>
							</div>
							<div class="card stat-card">
								<div class="stat-lbl">Max</div>
								<div class="stat-val">{{ currentMetricSummary ? formatNum(currentMetricSummary.maxValue) : '—' }}</div>
							</div>
							<div class="card stat-card">
								<div class="stat-lbl">Min</div>
								<div class="stat-val">{{ currentMetricSummary ? formatNum(currentMetricSummary.minValue) : '—' }}</div>
							</div>
							<div class="card stat-card">
								<div class="stat-lbl">Data points</div>
								<div class="stat-val">{{ currentMetricSummary ? currentMetricSummary.totalPoints.toLocaleString() : '—' }}</div>
							</div>
						</div>

						<!-- Chart -->
						<div class="card chart-card">
							<div class="chart-hd">
								<div class="chart-hd-l">
									<span class="chart-name">{{ selectedMetric }}</span>
									<span class="chart-sub">{{ chartType === 'line' ? 'avg value over time' : (selectedLabel ? 'total by ' + selectedLabel : 'no labels') }}</span>
								</div>
								<div class="chart-hd-r">
									<select v-if="chartType !== 'line' && labelKeys.length" v-model="selectedLabel" class="label-select">
										<option v-for="k in labelKeys" :key="k" :value="k">{{ k }}</option>
									</select>
									<div class="type-seg">
										<button
											v-for="opt in chartTypeOptions"
											:key="opt.value"
											class="seg"
											:class="{ active: chartType === opt.value }"
											@click="chartType = opt.value"
										>{{ opt.label }}</button>
									</div>
								</div>
							</div>
							<div v-if="seriesPending" class="chart-loading">
								<div class="sk" style="width:100%;height:100%;border-radius:6px" />
							</div>
							<div v-else-if="!seriesData?.series.length" class="chart-empty">
								No data for this period.
							</div>
							<template v-else>
								<!-- Line chart -->
								<template v-if="chartType === 'line'">
									<div class="chart-area">
										<svg viewBox="0 0 480 120" preserveAspectRatio="none" class="sparkline">
											<defs>
												<linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
													<stop offset="0%" stop-color="var(--brand)" stop-opacity="0.2" />
													<stop offset="100%" stop-color="var(--brand)" stop-opacity="0" />
												</linearGradient>
											</defs>
											<path v-if="sparkPath" :d="sparkPath + ' L 480,120 L 0,120 Z'" fill="url(#spark-fill)" />
											<path
												v-if="sparkPath"
												:d="sparkPath"
												fill="none"
												stroke="var(--brand)"
												stroke-width="1.8"
												stroke-linecap="round"
												stroke-linejoin="round"
											/>
										</svg>
									</div>
									<div class="chart-footer">
										<div v-for="(pt, i) in seriesData.series.slice(0, 8)" :key="i" class="chart-tick">
											<span class="tick-time">{{ new Date(pt.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}</span>
											<span class="tick-val">{{ formatNum(pt.avg) }}</span>
										</div>
									</div>
								</template>
								<!-- Bar/pie need labels -->
								<div v-else-if="!labelKeys.length" class="chart-empty">
									This metric has no labels to break down by. Pass labels in <code>client.metric(name, value, labels)</code>.
								</div>
								<!-- Bar chart -->
								<div v-else-if="chartType === 'bar'" class="breakdown-area">
									<div v-for="(b, i) in currentBreakdown" :key="b.value" class="bar-row">
										<span class="bar-label" :title="b.value">{{ b.value }}</span>
										<div class="bar-track">
											<div class="bar-fill" :style="{ width: (b.total / breakdownMax * 100) + '%', background: PALETTE[i % PALETTE.length] }" />
										</div>
										<span class="bar-val">{{ formatNum(b.total) }}</span>
									</div>
								</div>
								<!-- Pie chart -->
								<div v-else class="pie-area">
									<svg viewBox="0 0 100 100" class="pie-svg">
										<path v-for="s in pieSlices" :key="s.value" :d="s.path" :fill="s.color" />
									</svg>
									<div class="pie-legend">
										<div v-for="s in pieSlices" :key="s.value" class="legend-row">
											<span class="legend-dot" :style="{ background: s.color }" />
											<span class="legend-label" :title="s.value">{{ s.value }}</span>
											<span class="legend-val">{{ s.pct.toFixed(1) }}%</span>
										</div>
									</div>
								</div>
							</template>
						</div>
					</template>
				</div>
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

.metrics-wrap {
	display: flex;
	flex-direction: column;
	gap: 18px;
}

.page-hd {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 12px;
	flex-wrap: wrap;
}
.page-hd-l h2 { margin: 0; font: 600 20px var(--font-sans); color: var(--fg-hi); letter-spacing: -0.01em; }
.sdk-note { margin: 4px 0 0; font: 400 12.5px var(--font-sans); color: var(--mute); }
.sdk-note code {
	font-family: var(--font-mono);
	font-size: 11.5px;
	background: var(--bg-3);
	border: 1px solid var(--line);
	border-radius: 4px;
	padding: 1px 5px;
	color: var(--brand);
}

.range-seg {
	display: inline-flex;
	background: var(--bg-2);
	border: 1px solid var(--line);
	border-radius: 8px;
	padding: 3px;
}
.seg {
	padding: 5px 12px;
	font: 500 12px var(--font-sans);
	color: var(--dim);
	border-radius: 6px;
	cursor: pointer;
	border: none;
	background: transparent;
}
.seg.active { background: var(--bg-3); color: var(--fg-hi); }
.seg:hover:not(.active) { color: var(--fg-hi); }

.metrics-layout {
	display: grid;
	grid-template-columns: 240px 1fr;
	gap: 16px;
	align-items: start;
}
@media (max-width: 760px) {
	.metrics-layout { grid-template-columns: 1fr; }
}

.card {
	background: var(--bg-1);
	border: 1px solid var(--line);
	border-radius: 12px;
	overflow: hidden;
}

.metric-list-card { padding: 0; }
.list-hd {
	padding: 12px 16px;
	font: 600 12px var(--font-sans);
	color: var(--mute);
	text-transform: uppercase;
	letter-spacing: .06em;
	border-bottom: 1px solid var(--line);
}
.list-loading, .list-empty {
	padding: 16px;
	font: 400 13px var(--font-sans);
	color: var(--mute);
	display: flex;
	flex-direction: column;
	gap: 10px;
}
.list-row-sk { display: flex; flex-direction: column; gap: 4px; }
.sk {
	display: block;
	background: var(--bg-3);
	border-radius: 4px;
	animation: pulse 1.4s ease-in-out infinite;
}
@keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.4 } }
.list-empty code {
	font-family: var(--font-mono);
	font-size: 11.5px;
	background: var(--bg-3);
	border: 1px solid var(--line);
	border-radius: 4px;
	padding: 1px 5px;
	color: var(--brand);
}

.metric-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
	padding: 11px 16px;
	border-bottom: 1px solid var(--line);
	cursor: pointer;
	background: transparent;
	border-left: none;
	border-right: none;
	border-top: none;
	width: 100%;
	text-align: left;
}
.metric-row:last-child { border-bottom: 0; }
.metric-row:hover { background: var(--bg-2); }
.metric-row.active { background: color-mix(in oklab, var(--brand) 8%, var(--bg-1)); border-left: 2px solid var(--brand); padding-left: 14px; }
.metric-name { font: 500 13px var(--font-sans); color: var(--fg-hi); }
.metric-pts { font: 400 11px var(--font-mono); color: var(--mute); white-space: nowrap; }

.metric-detail-col { display: flex; flex-direction: column; gap: 14px; }
.detail-empty {
	padding: 48px;
	text-align: center;
	font: 400 13px var(--font-sans);
	color: var(--mute);
}

.summary-row {
	display: grid;
	grid-template-columns: repeat(4, 1fr);
	gap: 12px;
}
@media (max-width: 640px) {
	.summary-row { grid-template-columns: repeat(2, 1fr); }
}
.stat-card { padding: 16px; }
.stat-lbl { font: 500 11px var(--font-sans); color: var(--mute); text-transform: uppercase; letter-spacing: .06em; }
.stat-val { font: 700 22px var(--font-mono); color: var(--fg-hi); margin-top: 4px; }

.chart-card { padding: 0; }
.chart-hd {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 10px;
	padding: 12px 18px;
	border-bottom: 1px solid var(--line);
	flex-wrap: wrap;
}
.chart-hd-l { display: flex; align-items: baseline; gap: 8px; }
.chart-hd-r { display: flex; align-items: center; gap: 8px; }
.chart-name { font: 600 14px var(--font-sans); color: var(--fg-hi); }
.chart-sub { font: 400 12px var(--font-sans); color: var(--mute); }

.type-seg {
	display: inline-flex;
	background: var(--bg-2);
	border: 1px solid var(--line);
	border-radius: 8px;
	padding: 3px;
}
.label-select {
	padding: 5px 10px;
	font: 500 12px var(--font-sans);
	color: var(--fg-hi);
	background: var(--bg-2);
	border: 1px solid var(--line);
	border-radius: 7px;
	outline: none;
	cursor: pointer;
}

.breakdown-area {
	display: flex;
	flex-direction: column;
	gap: 10px;
	padding: 16px 18px;
}
.bar-row { display: grid; grid-template-columns: 120px 1fr 64px; align-items: center; gap: 10px; }
.bar-label { font: 500 12px var(--font-sans); color: var(--fg-hi); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bar-track { height: 18px; background: var(--bg-3); border-radius: 5px; overflow: hidden; }
.bar-fill { height: 100%; border-radius: 5px; min-width: 2px; transition: width .3s ease; }
.bar-val { font: 600 12px var(--font-mono); color: var(--fg-hi); text-align: right; }

.pie-area { display: flex; align-items: center; gap: 22px; padding: 18px; flex-wrap: wrap; }
.pie-svg { width: 140px; height: 140px; flex-shrink: 0; }
.pie-legend { display: flex; flex-direction: column; gap: 7px; flex: 1; min-width: 160px; }
.legend-row { display: grid; grid-template-columns: 12px 1fr auto; align-items: center; gap: 8px; }
.legend-dot { width: 10px; height: 10px; border-radius: 3px; }
.legend-label { font: 500 12px var(--font-sans); color: var(--fg-hi); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.legend-val { font: 600 12px var(--font-mono); color: var(--mute); }

.chart-empty code {
	font-family: var(--font-mono);
	font-size: 11px;
	background: var(--bg-3);
	border: 1px solid var(--line);
	border-radius: 4px;
	padding: 1px 5px;
	color: var(--brand);
}
.chart-loading {
	height: 140px;
	padding: 18px;
}
.chart-empty {
	height: 140px;
	display: grid;
	place-items: center;
	font: 400 13px var(--font-sans);
	color: var(--mute);
}
.chart-area {
	padding: 16px 18px 0;
	height: 140px;
}
.sparkline {
	width: 100%;
	height: 120px;
	display: block;
}
.chart-footer {
	display: flex;
	gap: 12px;
	overflow-x: auto;
	padding: 10px 18px 14px;
	border-top: 1px solid var(--line);
}
.chart-tick { display: flex; flex-direction: column; gap: 2px; min-width: 52px; }
.tick-time { font: 400 10px var(--font-mono); color: var(--mute); }
.tick-val { font: 600 12px var(--font-mono); color: var(--fg-hi); }

.px-4 { padding-left: 1rem; padding-right: 1rem; }
@media (min-width: 1024px) { .lg\:px-6 { padding-left: 1.5rem; padding-right: 1.5rem; } }
</style>
