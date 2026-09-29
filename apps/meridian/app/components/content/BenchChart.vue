<script setup lang="ts">
import { useIntersectionObserver } from '@vueuse/core';
import { BENCHMARKS, benchLabel, type GenRow, signedPct, type TickRow } from '~/config/benchmarks';

const props = withDefaults(
  defineProps<{
    scenario: 'botswarm' | 'rctclusters' | 'chunkgen';
    hideParity?: boolean;
  }>(),
  { hideParity: false },
);

interface Row {
  key: string;
  name: string;
  detail: string;
  divine: boolean;
  value: number;
  whisker?: number;
  valueText: string;
  delta: number;
  deltaText: string;
  cpuText: string;
  facts: [string, string][];
}

const BUDGET_MS = 50;
const isTick = computed(() => props.scenario !== 'chunkgen');

function tickRow(r: TickRow, detail: string, key: string): Row {
  return {
    key,
    name: r.build === 'divinemc' ? 'DivineMC' : benchLabel(r),
    detail,
    divine: r.build === 'divinemc',
    value: r.p50,
    whisker: r.p99,
    valueText: `${r.p50.toFixed(1)} ms`,
    delta: -r.p50VsPaper,
    deltaText: r.build === 'paper' ? 'baseline' : signedPct(-r.p50VsPaper, 0),
    cpuText: `${r.cores.toFixed(2)} cores`,
    facts: [
      ['p50 tick', `${r.p50.toFixed(2)} ms`],
      ['p99 tick', `${r.p99.toFixed(2)} ms`],
      ['Worst tick', `${r.max.toFixed(1)} ms`],
      ['p50 vs Paper', signedPct(-r.p50VsPaper)],
      ['p99 vs Paper', signedPct(-r.p99VsPaper)],
      ['Server CPU', `${r.cores.toFixed(2)} cores`],
      ['CPU vs Paper', signedPct(r.cpuVsPaper)],
      ['Run spread', `${r.spread.toFixed(1)}%`],
    ],
  };
}

function genRow(r: GenRow): Row {
  return {
    key: `${r.build}-${r.profile}`,
    name: r.build === 'divinemc' ? 'DivineMC' : benchLabel(r),
    detail: r.build === 'divinemc' ? r.profile : '',
    divine: r.build === 'divinemc',
    value: r.seconds,
    valueText: `${r.seconds.toFixed(1)} s`,
    delta: -r.vsPaper,
    deltaText: r.build === 'paper' ? 'baseline' : signedPct(-r.vsPaper, 0),
    cpuText: `${r.cpuSeconds} CPU-s`,
    facts: [
      ['Wall time', `${r.seconds.toFixed(1)} s`],
      ['Chunks per second', String(r.chunksPerSecond)],
      ['Time vs Paper', signedPct(-r.vsPaper)],
      ['CPU time', `${r.cpuSeconds} CPU-s`],
      ['CPU vs Paper', signedPct(r.cpuVsPaper)],
      ['Mean load', `${r.cores.toFixed(1)} cores`],
      ['Run spread', `${r.spread.toFixed(1)}%`],
    ],
  };
}

const rows = computed<Row[]>(() => {
  const keep = (r: { profile: string }) => !(props.hideParity && r.profile === 'parity');
  if (props.scenario === 'botswarm') {
    return BENCHMARKS.botswarm
      .filter(keep)
      .map(r => tickRow(r, r.build === 'divinemc' ? r.profile : '', `${r.build}-${r.profile}`));
  }
  if (props.scenario === 'rctclusters') {
    const sweep = ([4, 8, 12] as const).map(t => {
      const r = BENCHMARKS.rctclusters[t].find(x => x.build === 'divinemc');
      return tickRow(r as TickRow, `rct · ${t} threads`, `divinemc-rct-${t}`);
    });
    const base = BENCHMARKS.rctclusters[8].filter(r => r.build !== 'divinemc').map(r => tickRow(r, '', r.build));
    return [...sweep, ...base];
  }
  return BENCHMARKS.chunkgen.filter(keep).map(genRow);
});

const step = computed(() => (isTick.value ? 10 : 20));
const scaleMax = computed(() => {
  const top = Math.max(...rows.value.map(r => r.whisker ?? r.value), isTick.value ? BUDGET_MS : 0);
  return Math.ceil((top * 1.04) / step.value) * step.value;
});
const ticks = computed(() => Array.from({ length: scaleMax.value / step.value + 1 }, (_, i) => i * step.value));
const pct = (v: number) => `${(v / scaleMax.value) * 100}%`;
const unit = computed(() => (isTick.value ? 'ms' : 's'));

const active = ref<string | null>(null);

const root = ref<HTMLElement | null>(null);
const armed = ref(false);
const { stop } = useIntersectionObserver(
  root,
  ([entry]) => {
    if (!entry?.isIntersecting) return;
    armed.value = false;
    stop();
  },
  { threshold: 0.25 },
);
onMounted(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return stop();
  const box = root.value?.getBoundingClientRect();
  if (box && box.top > window.innerHeight) armed.value = true;
});
</script>

<template>
	<figure ref="root" class="bc" :class="{ 'bc--armed': armed }">
		<div class="bc-legend" aria-hidden="true">
			<span class="bc-key"><i class="bc-swatch bc-swatch--divine" />DivineMC</span>
			<span class="bc-key"><i class="bc-swatch" />Paper / Purpur</span>
			<template v-if="isTick">
				<span class="bc-key"><i class="bc-whisker-key" />p99</span>
				<span class="bc-key"><i class="bc-budget-key" />50 ms budget (20 TPS)</span>
			</template>
			<span class="bc-key bc-key--note">lower is better</span>
		</div>

		<div class="bc-grid" role="list">
			<div
				v-for="(r, i) in rows"
				:key="r.key"
				class="bc-row"
				:class="{ 'bc-row--divine': r.divine, 'bc-row--active': active === r.key }"
				:style="{ '--i': i }"
				role="listitem"
				tabindex="0"
				:aria-label="`${r.name} ${r.detail}: ${r.facts.map(([k, v]) => `${k} ${v}`).join(', ')}`"
				@pointerenter="active = r.key"
				@pointerleave="active = null"
				@focus="active = r.key"
				@blur="active = null"
				@click="active = active === r.key ? null : r.key"
			>
				<span class="bc-label">
					<span class="bc-name">{{ r.name }}</span>
					<span v-if="r.detail" class="bc-detail">{{ r.detail }}</span>
				</span>

				<span class="bc-track">
					<i v-for="t in ticks" :key="t" class="bc-gridline" :style="{ left: pct(t) }" />
					<i v-if="isTick" class="bc-budget" :style="{ left: pct(50) }" />
					<i class="bc-bar" :style="{ width: pct(r.value) }" />
					<template v-if="r.whisker">
						<i class="bc-whisker" :style="{ left: pct(r.value), width: `calc(${pct(r.whisker)} - ${pct(r.value)})` }" />
						<i class="bc-cap" :style="{ left: pct(r.whisker) }" />
					</template>

					<span
						v-if="active === r.key"
						class="bc-tip"
						:class="{ 'bc-tip--below': i < 2 }"
						role="tooltip"
						:style="{ '--x': pct(r.whisker ?? r.value) }">
						<span class="bc-tip__head">{{ r.name }} <span v-if="r.detail">{{ r.detail }}</span></span>
						<span v-for="[k, v] in r.facts" :key="k" class="bc-tip__row">
							<b>{{ v }}</b><span>{{ k }}</span>
						</span>
					</span>
				</span>

				<span class="bc-value">{{ r.valueText }}</span>
				<span class="bc-delta" :class="{ 'bc-delta--good': r.delta < -0.5, 'bc-delta--base': r.deltaText === 'baseline' }">
					{{ r.deltaText }}
				</span>
				<span class="bc-cpu">{{ r.cpuText }}</span>
			</div>

			<div class="bc-axis" aria-hidden="true">
				<span class="bc-axis__track">
					<span v-for="t in ticks" :key="t" class="bc-axis__tick" :style="{ left: pct(t) }">{{ t }}</span>
				</span>
				<span class="bc-axis__unit">{{ unit }}</span>
			</div>
		</div>

		<details class="bc-table">
			<summary>All numbers</summary>
			<div class="bc-table__scroll">
				<table>
					<thead>
						<tr>
							<th>Server</th>
							<th v-for="[k] in rows[0]?.facts" :key="k">{{ k }}</th>
						</tr>
					</thead>
					<tbody>
						<tr v-for="r in rows" :key="r.key">
							<th>{{ r.name }} {{ r.detail }}</th>
							<td v-for="[k, v] in r.facts" :key="k">{{ v }}</td>
						</tr>
					</tbody>
				</table>
			</div>
		</details>
	</figure>
</template>

<style scoped>
.bc {
	--bc-divine: var(--accent);
	--bc-other: var(--edge);
	--bc-bar: 18px;
	margin: 24px 0;
	padding: var(--s-6);
	background: var(--surface-card);
	border: 1px solid var(--line);
	border-radius: var(--r-1);
	font: 400 13px/1.4 var(--font-mono);
	color: var(--dim);
}

.bc-legend {
	display: flex;
	flex-wrap: wrap;
	gap: var(--s-2) var(--s-5);
	margin-bottom: var(--s-5);
	font-size: 12px;
	color: var(--mute);
}

.bc-key {
	display: inline-flex;
	align-items: center;
	gap: var(--s-2);
}

.bc-key--note {
	margin-left: auto;
}

.bc-swatch {
	width: 12px;
	height: 12px;
	border-radius: 0 3px 3px 0;
	background: var(--bc-other);
}

.bc-swatch--divine {
	background: var(--bc-divine);
}

.bc-whisker-key {
	position: relative;
	width: 16px;
	height: 2px;
	background: var(--dim);
}

.bc-whisker-key::after {
	content: '';
	position: absolute;
	right: 0;
	top: -4px;
	width: 2px;
	height: 10px;
	background: var(--dim);
}

.bc-budget-key {
	width: 1px;
	height: 14px;
	background: var(--warn);
}

.bc-grid {
	display: grid;
	grid-template-columns: minmax(8.5rem, max-content) minmax(0, 1fr) 4.75rem 3.75rem 6.5rem;
	column-gap: var(--s-4);
}

.bc-row {
	display: grid;
	grid-column: 1 / -1;
	grid-template-columns: subgrid;
	border-radius: var(--r-1);
	cursor: default;
	transition: background-color 0.15s ease;
}

.bc-row > * {
	display: flex;
	align-items: center;
	min-height: 40px;
}

.bc-row:focus-visible {
	outline-offset: 0;
}

.bc-row--active {
	background: color-mix(in oklab, var(--surface-2) 70%, transparent);
}

.bc-label {
	gap: var(--s-2);
	padding-left: var(--s-2);
	white-space: nowrap;
}

.bc-name {
	color: var(--fg);
}

.bc-detail {
	color: var(--mute);
}

.bc-track {
	position: relative;
}

.bc-gridline,
.bc-budget {
	position: absolute;
	top: 0;
	bottom: 0;
	width: 1px;
	background: var(--line);
}

.bc-budget {
	background: var(--warn);
}

.bc-bar {
	position: relative;
	height: var(--bc-bar);
	border-radius: 0 4px 4px 0;
	background: var(--bc-other);
	transform-origin: left center;
	transition:
		transform 0.7s cubic-bezier(0.2, 0.7, 0.2, 1) calc(var(--i) * 60ms),
		filter 0.15s ease;
}

.bc-row--divine .bc-bar {
	background: var(--bc-divine);
}

.bc-row--active .bc-bar {
	filter: brightness(1.18);
}

.bc-whisker,
.bc-cap {
	position: absolute;
	top: 50%;
	background: var(--dim);
	transition: opacity 0.3s ease calc(var(--i) * 60ms + 0.5s);
}

.bc-whisker {
	height: 2px;
	margin-top: -1px;
}

.bc-cap {
	width: 2px;
	height: 10px;
	margin: -5px 0 0 -1px;
}

.bc--armed .bc-bar {
	transform: scaleX(0);
}

.bc--armed .bc-whisker,
.bc--armed .bc-cap {
	opacity: 0;
}

.bc-value,
.bc-delta,
.bc-cpu {
	justify-content: flex-end;
	font-variant-numeric: tabular-nums;
	white-space: nowrap;
}

.bc-value {
	color: var(--fg);
}

.bc-delta {
	color: var(--dim);
}

.bc-delta--good {
	color: var(--fg-hi);
	font-weight: 600;
}

.bc-delta--base {
	color: var(--mute);
}

.bc-cpu {
	padding-right: var(--s-2);
	color: var(--mute);
}

.bc-tip {
	position: absolute;
	z-index: 5;
	bottom: calc(50% + 14px);
	left: clamp(0px, calc(var(--x) - 7rem), calc(100% - 14rem));
	display: grid;
	gap: 2px;
	width: 14rem;
	padding: var(--s-3);
	background: var(--surface-3);
	border: 1px solid var(--line-2);
	border-radius: var(--r-3);
	box-shadow: var(--shadow-panel);
	pointer-events: none;
	font-size: 12px;
}

.bc-tip--below {
	top: calc(50% + 14px);
	bottom: auto;
}

.bc-tip__head {
	margin-bottom: var(--s-1);
	color: var(--fg);
}

.bc-tip__head span {
	color: var(--mute);
}

.bc-tip__row {
	display: flex;
	justify-content: space-between;
	gap: var(--s-3);
	color: var(--mute);
}

.bc-tip__row b {
	order: 2;
	font-weight: 600;
	color: var(--fg-hi);
	font-variant-numeric: tabular-nums;
}

.bc-axis {
	display: grid;
	grid-column: 1 / -1;
	grid-template-columns: subgrid;
	margin-top: var(--s-1);
}

.bc-axis__track {
	position: relative;
	grid-column: 2;
	height: 18px;
}

.bc-axis__tick {
	position: absolute;
	transform: translateX(-50%);
	font-size: 11px;
	color: var(--mute);
	font-variant-numeric: tabular-nums;
}

.bc-axis__unit {
	grid-column: 3;
	font-size: 11px;
	color: var(--mute);
}

.bc-table {
	margin-top: var(--s-4);
	border-top: 1px solid var(--line);
	padding-top: var(--s-3);
}

.bc-table summary {
	width: max-content;
	min-height: 32px;
	display: flex;
	align-items: center;
	cursor: pointer;
	font-size: 12px;
	color: var(--mute);
}

.bc-table summary:hover {
	color: var(--fg);
}

.bc-table__scroll {
	overflow-x: auto;
	margin-top: var(--s-2);
}

.bc-table table {
	width: 100%;
	border-collapse: collapse;
	font-size: 12px;
	font-variant-numeric: tabular-nums;
}

.bc-table th,
.bc-table td {
	padding: 6px 10px;
	border-bottom: 1px solid var(--line);
	text-align: right;
	white-space: nowrap;
}

.bc-table thead th {
	color: var(--mute);
	font-weight: 500;
}

.bc-table tbody th {
	text-align: left;
	font-weight: 400;
	color: var(--fg);
}

.bc-table td {
	color: var(--dim);
}

@media (max-width: 720px) {
	.bc {
		padding: var(--s-4);
	}

	.bc-key--note {
		margin-left: 0;
	}

	.bc-grid {
		grid-template-columns: minmax(0, 1fr) auto auto;
		column-gap: var(--s-3);
	}

	.bc-row > * {
		min-height: 28px;
	}

	.bc-label {
		grid-row: 1;
		grid-column: 1;
		padding-top: var(--s-2);
	}

	.bc-value {
		grid-row: 1;
		grid-column: 2;
		padding-top: var(--s-2);
	}

	.bc-delta {
		grid-row: 1;
		grid-column: 3;
		padding-top: var(--s-2);
		padding-right: var(--s-2);
	}

	.bc-cpu {
		display: none;
	}

	.bc-track {
		grid-row: 2;
		grid-column: 1 / -1;
		margin: 0 var(--s-2) var(--s-2);
	}

	.bc-axis__track {
		grid-column: 1 / -1;
		margin: 0 var(--s-2);
	}

	.bc-axis__unit {
		display: none;
	}
}

@media (prefers-reduced-motion: reduce) {
	.bc-bar,
	.bc-whisker,
	.bc-cap {
		transition: none;
	}
}
</style>
