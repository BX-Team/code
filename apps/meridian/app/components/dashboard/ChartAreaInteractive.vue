<script setup lang="ts">
import { VisXYContainer, VisArea, VisLine, VisAxis, VisCrosshair, VisTooltip } from '@unovis/vue'
import { CurveType } from '@unovis/ts'
import type { ChartConfig } from '@/components/ui/chart'

interface DataPoint {
	date: Date
	[key: string]: any
}

const props = defineProps<{
	data: DataPoint[]
	config: ChartConfig
	title: string
	description?: string
	loading?: boolean
	timeRange?: '24h' | '7d' | '30d'
}>()

const emit = defineEmits<{ 'update:timeRange': [string] }>()

const ranges = [
	{ label: '24h', value: '24h' },
	{ label: '7d', value: '7d' },
	{ label: '30d', value: '30d' },
]

const seriesKeys = computed(() => Object.keys(props.config))

function xAccessor(d: DataPoint) {
	return d.date.getTime()
}

function yAccessorFor(key: string) {
	return (d: DataPoint) => Number(d[key] ?? 0)
}

const tickFormat = computed(() => {
	const range = props.timeRange ?? '7d'
	return (t: number) => {
		const d = new Date(t)
		if (range === '24h') {
			return d.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false })
		}
		return d.toLocaleDateString('en', { month: 'short', day: 'numeric' })
	}
})

const yTickFormat = (v: number) => {
	if (v >= 1000) return `${(v / 1000).toFixed(1)}k`
	return String(Math.round(v))
}

const tooltipTemplate = (d: DataPoint) => {
	const lines = seriesKeys.value.map(k => {
		const cfg = props.config[k]
		if (!cfg) return ''
		return `<div style="display:flex;align-items:center;gap:8px;font:500 12px var(--font-sans)">
			<span style="width:8px;height:8px;border-radius:2px;background:${cfg.color};flex-shrink:0"></span>
			<span style="color:var(--dim)">${cfg.label}</span>
			<span style="margin-left:auto;color:var(--fg-hi);font-family:var(--font-mono)">${Number(d[k] ?? 0).toLocaleString()}</span>
		</div>`
	}).join('')
	const dateStr = d.date.toLocaleString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
	return `<div style="background:var(--bg-2);border:1px solid var(--line);border-radius:8px;padding:10px 12px;min-width:160px">
		<div style="font:500 11px var(--font-mono);color:var(--mute);margin-bottom:8px">${dateStr}</div>
		${lines}
	</div>`
}
</script>

<template>
	<div class="chart-wrap">
		<div class="chart-hd">
			<div>
				<h3 class="chart-title">{{ title }}</h3>
				<p v-if="description" class="chart-desc">{{ description }}</p>
			</div>
			<div class="chart-controls">
				<div class="legend">
					<span v-for="[key, cfg] in Object.entries(config)" :key="key" class="legend-item">
						<span class="swatch" :style="{ background: cfg.color }" />
						{{ cfg.label }}
					</span>
				</div>
				<div v-if="timeRange !== undefined" class="range-seg">
					<button
						v-for="r in ranges"
						:key="r.value"
						class="seg"
						:class="{ active: timeRange === r.value }"
						@click="emit('update:timeRange', r.value)"
					>{{ r.label }}</button>
				</div>
			</div>
		</div>

		<div v-if="loading || !data.length" class="chart-empty">
			<div v-if="loading" class="chart-skeleton" />
			<span v-else class="no-data">No data for this period</span>
		</div>
		<template v-else>
			<VisXYContainer
				:data="data"
				:height="240"
				:padding="{ left: 8, right: 8 }"
			>
				<template v-for="[key, cfg] in Object.entries(config)" :key="key">
					<VisArea
						:x="xAccessor"
						:y="yAccessorFor(key)"
						:color="cfg.color"
						:opacity="0.15"
						:curve-type="CurveType.MonotoneX"
					/>
					<VisLine
						:x="xAccessor"
						:y="yAccessorFor(key)"
						:color="cfg.color"
						:curve-type="CurveType.MonotoneX"
						:line-width="2"
					/>
				</template>
				<VisAxis type="x" :tick-format="tickFormat" />
				<VisAxis type="y" :tick-format="yTickFormat" />
				<VisCrosshair :color="'var(--line-2)'" :template="tooltipTemplate" />
				<VisTooltip />
			</VisXYContainer>
		</template>
	</div>
</template>

<style scoped>
.chart-wrap {
	background: var(--bg-1);
	border: 1px solid var(--line);
	border-radius: 12px;
	padding: 18px;
}

.chart-hd {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 12px;
	margin-bottom: 14px;
	flex-wrap: wrap;
}
.chart-title { margin: 0 0 2px; font: 600 14.5px var(--font-sans); color: var(--fg-hi); }
.chart-desc  { margin: 0; font: 400 12.5px var(--font-sans); color: var(--mute); }

.chart-controls {
	display: flex;
	align-items: center;
	gap: 14px;
}

.legend {
	display: flex;
	gap: 14px;
	font: 500 11.5px var(--font-sans);
	color: var(--dim);
}
.legend-item {
	display: inline-flex;
	align-items: center;
	gap: 6px;
}
.swatch {
	width: 10px;
	height: 10px;
	border-radius: 3px;
}

.range-seg {
	display: inline-flex;
	align-items: center;
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

.chart-empty {
	height: 240px;
	display: flex;
	align-items: center;
	justify-content: center;
}
.chart-skeleton {
	width: 100%;
	height: 100%;
	border-radius: 6px;
	background: var(--bg-2);
	animation: pulse 1.4s ease-in-out infinite;
}
@keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.4 } }
.no-data { font: 400 13px var(--font-sans); color: var(--mute); }
</style>
