<script setup lang="ts">
import ChartAreaInteractive from '@/components/dashboard/ChartAreaInteractive.vue'
import ProjectTabs from '@/components/dashboard/ProjectTabs.vue'
import SectionCards from '@/components/dashboard/SectionCards.vue'
import type { ChartConfig } from '@/components/ui/chart'

definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const route = useRoute()
const slug = computed(() => route.params.slug as string)

const { data: projects } = await useProjects()
const project = computed(() => (projects.value ?? []).find(p => p.slug === slug.value) ?? null)

const range = ref<'24h' | '7d' | '30d'>('24h')

interface TimePoint {
	time: string
	online?: number
	tps?: number
	mspt?: number
	memory_used?: number
}

interface StatsResponse {
	project: { id: string; name: string; slug: string; type: 'server' | 'plugin' | 'mod' }
	metadata: { lastSeenAt: string; software: string | null; mcVersion: string | null; countryCode: string | null } | null
	timeseries: TimePoint[]
	summary: { totalErrors: number }
	range: '24h' | '7d' | '30d'
}

interface PlayersResponse {
	sessions: Array<{ player_uuid: string; joined_at: string; client_version: string; country_code: string }>
	summary: { uniquePlayers: number; newPlayers: number }
}

const { data: stats, pending } = await useAsyncData<StatsResponse | null>(
	`project-stats-${slug.value}`,
	() =>
		project.value
			? $fetch<StatsResponse>(`/api/v3/projects/${project.value.id}/stats`, { query: { range: range.value } })
			: Promise.resolve(null),
	{ watch: [range] },
)

const { data: players } = await useAsyncData<PlayersResponse | null>(
	`project-players-${slug.value}`,
	() =>
		project.value?.type === 'server'
			? $fetch<PlayersResponse>(`/api/v3/projects/${project.value.id}/players`)
			: Promise.resolve(null),
)

interface ErrorRow {
	id: string
	plugin: string
	message: string
	level: string
	count: number
	lastSeenAt: string
}
interface ErrorsResponse { errors: ErrorRow[]; total: number }

const { data: errorsData } = await useAsyncData<ErrorsResponse | null>(
	`project-errors-${slug.value}`,
	() =>
		project.value
			? $fetch<ErrorsResponse>(`/api/v3/projects/${project.value.id}/errors`)
			: Promise.resolve(null),
)

const seriesData = computed(() =>
	(stats.value?.timeseries ?? []).map(p => ({
		date: new Date(p.time),
		online: Number(p.online ?? 0),
		tps: Number(p.tps ?? 0),
	})),
)

const chartConfig = computed((): ChartConfig => {
	if (project.value?.type === 'server') {
		return {
			online: { label: 'Players online', color: 'var(--brand)' },
			tps: { label: 'TPS', color: 'var(--brand-2)' },
		}
	}
	return { online: { label: 'Events', color: 'var(--brand)' } }
})

const latestPoint = computed(() => {
	const ts = stats.value?.timeseries ?? []
	return ts[ts.length - 1] ?? null
})

const peakOnline = computed(() => {
	const ts = stats.value?.timeseries ?? []
	return ts.length ? Math.max(...ts.map(p => Number(p.online ?? 0))) : 0
})

const avgTps = computed(() => {
	const ts = stats.value?.timeseries ?? []
	if (!ts.length) return 0
	const sum = ts.reduce((a, p) => a + Number(p.tps ?? 0), 0)
	return Math.round((sum / ts.length) * 10) / 10
})

const heapUsed = computed(() => {
	const v = Number(latestPoint.value?.memory_used ?? 0)
	return v > 0 ? `${(v / 1024 / 1024 / 1024).toFixed(1)} GB` : '—'
})

const tpsNow = computed(() => {
	const v = Number(latestPoint.value?.tps ?? 0)
	return v > 0 ? v.toFixed(2) : '—'
})

const msptNow = computed(() => {
	const v = Number(latestPoint.value?.mspt ?? 0)
	return v > 0 ? `${v.toFixed(1)} ms` : '—'
})

const tpsPercent = computed(() => {
	const v = Number(latestPoint.value?.tps ?? 0)
	return Math.min(100, (v / 20) * 100)
})

const msptPercent = computed(() => {
	const v = Number(latestPoint.value?.mspt ?? 0)
	return Math.min(100, (v / 50) * 100)
})

const memPercent = computed(() => {
	const v = Number(latestPoint.value?.memory_used ?? 0)
	const gb = v / 1024 / 1024 / 1024
	return Math.min(100, (gb / 24) * 100)
})

const returningPlayers = computed(() => {
	const s = players.value?.summary
	if (!s) return 0
	return s.uniquePlayers - s.newPlayers
})

const newPlayers = computed(() => players.value?.summary.newPlayers ?? 0)
const totalPlayers = computed(() => players.value?.summary.uniquePlayers ?? 0)

const returningPct = computed(() =>
	totalPlayers.value > 0 ? Math.round((returningPlayers.value / totalPlayers.value) * 100) : 0,
)
const newPct = computed(() => totalPlayers.value > 0 ? 100 - returningPct.value : 0)

const donutDash1 = computed(() => `${returningPct.value} ${100 - returningPct.value}`)
const donutDash2 = computed(() => `${newPct.value} ${100 - newPct.value}`)
const donutOffset2 = computed(() => -(returningPct.value))

const cardStats = computed(() => {
	if (!project.value) return []
	const errs = stats.value?.summary.totalErrors ?? 0
	const meta = stats.value?.metadata

	if (project.value.type === 'server') {
		return [
			{
				label: 'Peak online',
				value: peakOnline.value.toLocaleString(),
				caption: `Highest concurrent players`,
				hint: `Last ${range.value}`,
				trend: peakOnline.value > 0 ? { direction: 'up' as const, value: 'live' } : undefined,
			},
			{
				label: 'Avg TPS',
				value: avgTps.value || '—',
				caption: avgTps.value >= 19.5 ? 'Healthy' : avgTps.value > 0 ? 'Degraded' : 'No data',
				hint: '20.0 is perfect',
				trend: avgTps.value >= 19.5 ? { direction: 'up' as const, value: '+stable' } : undefined,
			},
			{
				label: 'Unique players (24h)',
				value: totalPlayers.value.toLocaleString(),
				caption: `${newPlayers.value} new players`,
				hint: 'Distinct UUIDs',
				trend: newPlayers.value > 0 ? { direction: 'up' as const, value: `+${newPlayers.value}` } : undefined,
			},
			{
				label: 'Errors',
				value: errs.toLocaleString(),
				caption: errs > 0 ? 'Needs attention' : 'No errors',
				hint: meta?.lastSeenAt ? `Last heartbeat ${new Date(meta.lastSeenAt).toLocaleString()}` : 'Awaiting heartbeat',
				trend: errs > 0 ? { direction: 'down' as const, value: 'review' } : undefined,
			},
		]
	}

	return [
		{
			label: 'Errors',
			value: errs.toLocaleString(),
			caption: errs > 0 ? 'Needs attention' : 'No errors reported',
			hint: 'Total error groups',
			trend: errs > 0 ? { direction: 'down' as const, value: 'review' } : undefined,
		},
		{
			label: 'Type',
			value: project.value.type.charAt(0).toUpperCase() + project.value.type.slice(1),
			caption: 'Pulsify project type',
			hint: 'Classification of this project',
		},
		{
			label: 'Last seen',
			value: meta?.lastSeenAt ? new Date(meta.lastSeenAt).toLocaleDateString() : '—',
			caption: meta?.software ?? '—',
			hint: meta?.mcVersion ?? '',
		},
	]
})

function levelClass(level: string) {
	if (level === 'error' || level === 'fatal') return 'err'
	if (level === 'warning' || level === 'warn') return 'warn'
	return 'info'
}

function relativeTime(iso: string) {
	const diff = Date.now() - new Date(iso).getTime()
	const m = Math.floor(diff / 60000)
	if (m < 1) return 'just now'
	if (m < 60) return `${m}m ago`
	const h = Math.floor(m / 60)
	if (h < 24) return `${h}h ago`
	return `${Math.floor(h / 24)}d ago`
}

const metaSub = computed(() => {
	if (!project.value || !stats.value?.metadata) return ''
	const m = stats.value.metadata
	const parts = [m.software, m.mcVersion].filter(Boolean)
	return parts.join(' · ')
})
</script>

<template>
	<div v-if="!project" class="px-4 lg:px-6">
		<div class="not-found">Project not found.</div>
	</div>

	<template v-else>
		<ProjectTabs :slug="project.slug" :project-type="project.type" />

		<!-- Section header -->
		<div class="sec-h px-4 lg:px-6">
			<div class="sec-h-l">
				<h2>{{ project.name }}</h2>
				<span class="sub">{{ metaSub || project.type }}</span>
			</div>
			<div class="range-seg">
				<button
					v-for="r in ['24h', '7d', '30d']"
					:key="r"
					class="seg"
					:class="{ active: range === r }"
					@click="range = r as any"
				>{{ r }}</button>
			</div>
		</div>

		<!-- KPIs -->
		<SectionCards :stats="cardStats" :loading="pending" />

		<!-- Server-only: health grid -->
		<div v-if="project.type === 'server' && latestPoint" class="px-4 lg:px-6">
			<div class="card">
				<div class="card-hd">
					<div>
						<h3>Server health</h3>
						<p>TPS, MSPT and memory — last data point</p>
					</div>
					<span class="status-pill">
						<span class="dot ok" />
						Reporting
					</span>
				</div>
				<div class="health-grid">
					<div class="h-cell">
						<div class="hl">TPS</div>
						<div class="hv">{{ tpsNow }}<span class="hu">/20</span></div>
						<div class="hb"><div :style="{ width: tpsPercent + '%', background: 'var(--brand-2)' }" /></div>
					</div>
					<div class="h-cell">
						<div class="hl">MSPT</div>
						<div class="hv">{{ msptNow }}</div>
						<div class="hb"><div :style="{ width: msptPercent + '%', background: 'var(--brand-2)' }" /></div>
					</div>
					<div class="h-cell">
						<div class="hl">Heap used</div>
						<div class="hv">{{ heapUsed }}</div>
						<div class="hb"><div :style="{ width: memPercent + '%', background: 'var(--brand)' }" /></div>
					</div>
				</div>
			</div>
		</div>

		<!-- Chart + Donut (server only) / Chart alone (plugin) -->
		<div v-if="project.type === 'server'" class="px-4 lg:px-6 grid-2-row">
			<ChartAreaInteractive
				v-model:time-range="range"
				title="Concurrent players"
				description="Online players and TPS over time"
				:data="seriesData"
				:config="chartConfig"
				:loading="pending"
			/>

			<div class="card donut-card">
				<div class="card-hd">
					<div>
						<h3>New vs returning</h3>
						<p>Last 24h · {{ totalPlayers.toLocaleString() }} sessions</p>
					</div>
				</div>
				<div v-if="totalPlayers > 0" class="donut-wrap">
					<div class="donut-svg-wrap">
						<svg viewBox="0 0 36 36" width="130" height="130">
							<circle cx="18" cy="18" r="15.915" fill="none" stroke="var(--bg-3)" stroke-width="3.5" />
							<circle
								cx="18" cy="18" r="15.915" fill="none"
								stroke="var(--brand)" stroke-width="3.5"
								:stroke-dasharray="donutDash1"
								stroke-dashoffset="25"
								transform="rotate(-90 18 18)"
							/>
							<circle
								cx="18" cy="18" r="15.915" fill="none"
								stroke="var(--brand-2)" stroke-width="3.5"
								:stroke-dasharray="donutDash2"
								:stroke-dashoffset="-donutOffset2 + 25 - returningPct"
								transform="rotate(-90 18 18)"
							/>
						</svg>
						<div class="donut-mid">
							<div class="dv">{{ returningPct }}%</div>
							<div class="dl">returning</div>
						</div>
					</div>
					<div class="legend-rows">
						<div class="lr"><span class="sw brand" />Returning <span class="lv">{{ returningPlayers.toLocaleString() }}</span></div>
						<div class="lr"><span class="sw brand2" />New <span class="lv">{{ newPlayers.toLocaleString() }}</span></div>
					</div>
				</div>
				<div v-else class="donut-empty">No player data for this period</div>
			</div>
		</div>

		<div v-else class="px-4 lg:px-6">
			<ChartAreaInteractive
				v-model:time-range="range"
				title="Activity"
				description="Events over time"
				:data="seriesData"
				:config="chartConfig"
				:loading="pending"
			/>
		</div>

		<!-- Issues -->
		<div class="px-4 lg:px-6">
			<div class="card err-card">
				<div class="card-hd-err">
					<div>
						<h3>Recent issues</h3>
						<p>Last reported errors · {{ errorsData?.total ?? 0 }} total</p>
					</div>
					<button class="link-btn" @click="navigateTo(`/dashboard/${project.slug}/errors`)">
						View all {{ errorsData?.total ?? 0 }} →
					</button>
				</div>
				<div v-if="!(errorsData?.errors?.length)" class="err-empty">
					No issues reported. Nice.
				</div>
				<template v-else>
					<div
						v-for="err in (errorsData?.errors ?? []).slice(0, 5)"
						:key="err.id"
						class="err-row"
						@click="navigateTo(`/dashboard/${project.slug}/errors`)"
					>
						<span class="lvl" :class="levelClass(err.level)">{{ err.level }}</span>
						<div class="err-msg">
							<div class="err-title">{{ err.message }}</div>
							<div class="err-meta">{{ err.plugin }}</div>
						</div>
						<div class="err-count">
							{{ err.count }}
							<span class="sub">events</span>
						</div>
						<div class="err-when">{{ relativeTime(err.lastSeenAt) }}</div>
					</div>
				</template>
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
	font: 400 13px var(--font-sans);
}

.sec-h {
	display: flex;
	align-items: flex-end;
	justify-content: space-between;
	margin: 4px 0 14px;
}
.sec-h h2 { margin: 0; font: 600 18px var(--font-sans); color: var(--fg-hi); letter-spacing: -0.01em; }
.sub { font: 400 13px var(--font-sans); color: var(--mute); margin-top: 2px; }
.sec-h-l { display: flex; flex-direction: column; }

.range-seg {
	display: inline-flex;
	background: var(--bg-1);
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

/* health card */
.card {
	background: var(--bg-1);
	border: 1px solid var(--line);
	border-radius: 12px;
	padding: 18px;
}
.card-hd {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 12px;
	margin-bottom: 14px;
}
.card-hd h3 { margin: 0 0 2px; font: 600 14.5px var(--font-sans); color: var(--fg-hi); }
.card-hd p  { margin: 0; font: 400 12.5px var(--font-sans); color: var(--mute); }

.status-pill {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	font: 500 12px var(--font-sans);
	color: var(--dim);
	white-space: nowrap;
}
.dot { width: 6px; height: 6px; border-radius: 50%; }
.dot.ok { background: var(--ok); box-shadow: 0 0 6px var(--ok); }

.health-grid {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: 14px;
}
@media (max-width: 640px) { .health-grid { grid-template-columns: 1fr; } }

.h-cell {
	border: 1px solid var(--line);
	border-radius: 10px;
	padding: 14px;
	background: var(--bg-2);
}
.hl { font: 500 11.5px var(--font-sans); color: var(--mute); }
.hv { font: 600 22px var(--font-sans); color: var(--fg-hi); margin-top: 4px; letter-spacing: -0.01em; }
.hu { font: 500 12px var(--font-mono); color: var(--dim); margin-left: 3px; }
.hb { margin-top: 8px; height: 4px; border-radius: 2px; background: var(--bg-3); overflow: hidden; }
.hb > div { height: 100%; border-radius: 2px; transition: width 0.4s; }

/* chart + donut grid */
.grid-2-row {
	display: grid;
	grid-template-columns: 2fr 1fr;
	gap: 14px;
	align-items: start;
}
@media (max-width: 900px) { .grid-2-row { grid-template-columns: 1fr; } }

.donut-card { height: 100%; }
.donut-wrap {
	display: grid;
	grid-template-columns: 130px 1fr;
	align-items: center;
	gap: 22px;
}
.donut-svg-wrap { position: relative; }
.donut-mid {
	position: absolute;
	inset: 0;
	display: grid;
	place-items: center;
	text-align: center;
}
.dv { font: 600 22px var(--font-sans); color: var(--fg-hi); letter-spacing: -0.01em; }
.dl { font: 400 11px var(--font-sans); color: var(--mute); margin-top: -2px; }

.legend-rows { display: flex; flex-direction: column; gap: 10px; }
.lr {
	display: flex;
	align-items: center;
	gap: 10px;
	font: 500 12.5px var(--font-sans);
	color: var(--fg-hi);
}
.sw {
	width: 10px; height: 10px;
	border-radius: 3px;
	flex-shrink: 0;
}
.sw.brand  { background: var(--brand); }
.sw.brand2 { background: var(--brand-2); }
.lv { margin-left: auto; font: 500 12px var(--font-mono); color: var(--dim); }

.donut-empty {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 120px;
	font: 400 12.5px var(--font-sans);
	color: var(--mute);
}

/* errors */
.err-card { padding: 0; }
.card-hd-err {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 12px;
	padding: 18px 18px 12px;
	border-bottom: 1px solid var(--line);
}
.card-hd-err h3 { margin: 0 0 2px; font: 600 14.5px var(--font-sans); color: var(--fg-hi); }
.card-hd-err p  { margin: 0; font: 400 12.5px var(--font-sans); color: var(--mute); }

.link-btn {
	font: 500 11.5px var(--font-mono);
	color: var(--brand);
	background: transparent;
	border: none;
	cursor: pointer;
	white-space: nowrap;
}
.link-btn:hover { text-decoration: underline; }

.err-empty {
	padding: 36px 18px;
	text-align: center;
	font: 400 13px var(--font-sans);
	color: var(--mute);
}

.err-row {
	display: grid;
	grid-template-columns: 80px 1fr 70px 80px;
	gap: 12px;
	padding: 12px 18px;
	border-bottom: 1px solid var(--line);
	align-items: center;
	cursor: pointer;
}
.err-row:last-child { border-bottom: 0; }
.err-row:hover { background: var(--bg-2); }

.lvl {
	display: inline-flex;
	align-items: center;
	font: 600 9.5px var(--font-mono);
	padding: 3px 7px;
	border-radius: 4px;
	letter-spacing: .05em;
	text-transform: uppercase;
}
.lvl.err {
	background: color-mix(in oklab, var(--err) 22%, transparent);
	color: var(--err);
	border: 1px solid color-mix(in oklab, var(--err) 50%, transparent);
}
.lvl.warn {
	background: color-mix(in oklab, var(--warn) 20%, transparent);
	color: var(--warn);
	border: 1px solid color-mix(in oklab, var(--warn) 45%, transparent);
}
.lvl.info {
	background: color-mix(in oklab, var(--info) 20%, transparent);
	color: var(--info);
	border: 1px solid color-mix(in oklab, var(--info) 45%, transparent);
}

.err-msg { min-width: 0; }
.err-title {
	font: 500 13px var(--font-sans);
	color: var(--fg-hi);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}
.err-meta {
	font: 400 11.5px var(--font-mono);
	color: var(--mute);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	margin-top: 2px;
}

.err-count {
	font: 600 13px var(--font-mono);
	color: var(--fg-hi);
	text-align: right;
}
.err-count .sub { display: block; font: 400 10.5px var(--font-mono); color: var(--mute); }
.err-when { font: 400 11.5px var(--font-mono); color: var(--mute); text-align: right; }

/* spacing helpers */
.px-4 { padding-left: 1rem; padding-right: 1rem; }
@media (min-width: 1024px) { .lg\:px-6 { padding-left: 1.5rem; padding-right: 1.5rem; } }
</style>
