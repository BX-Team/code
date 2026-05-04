<script setup lang="ts">
import ChartAreaInteractive from '@/components/dashboard/ChartAreaInteractive.vue'
import type { ProjectRow } from '@/components/dashboard/ProjectsDataTable.vue'
import ProjectsDataTable from '@/components/dashboard/ProjectsDataTable.vue'
import SectionCards from '@/components/dashboard/SectionCards.vue'
import type { ChartConfig } from '@/components/ui/chart'

definePageMeta({ layout: 'dashboard', middleware: 'auth' })

interface OverviewResponse {
	summary: {
		projects: number
		servers: number
		plugins: number
		mods: number
		totalErrors: number
		totalEvents24h: number
		peakOnline24h: number
		uniquePlayers24h: number
	}
	timeseries: Array<{ time: string; online?: number; tps?: number }>
	projects: ProjectRow[]
	range: '24h' | '7d' | '30d'
}

const range = ref<'24h' | '7d' | '30d'>('7d')

const { data: overview, pending } = await useAsyncData<OverviewResponse>(
	'v3-overview',
	() => $fetch<OverviewResponse>('/api/v3/overview', { query: { range: range.value } }),
	{ watch: [range] },
)

const stats = computed(() => {
	const s = overview.value?.summary
	return [
		{
			label: 'Total Players',
			value: (s?.uniquePlayers24h ?? 0).toLocaleString(),
			caption: 'Active in the last 24h',
			hint: 'Distinct UUIDs across all servers',
			trend: s && s.uniquePlayers24h > 0 ? { direction: 'up' as const, value: '+24h' } : undefined,
		},
		{
			label: 'Peak Online',
			value: (s?.peakOnline24h ?? 0).toLocaleString(),
			caption: 'Highest concurrent players',
			hint: 'Across all reporting servers',
			trend: s && s.peakOnline24h > 0 ? { direction: 'up' as const, value: 'live' } : undefined,
		},
		{
			label: 'Active Projects',
			value: s?.projects ?? 0,
			caption: `${s?.servers ?? 0} servers · ${s?.plugins ?? 0} plugins · ${s?.mods ?? 0} mods`,
			hint: 'All workspaces you own',
		},
		{
			label: 'Errors',
			value: (s?.totalErrors ?? 0).toLocaleString(),
			caption: s && s.totalErrors > 0 ? 'Needs attention' : 'No errors reported',
			hint: 'Aggregated across all projects',
			trend: s && s.totalErrors > 0 ? { direction: 'down' as const, value: 'review' } : undefined,
		},
	]
})

const seriesData = computed(() =>
	(overview.value?.timeseries ?? []).map(p => ({
		date: new Date(p.time),
		online: Number(p.online ?? 0),
	})),
)

const chartConfig: ChartConfig = {
	online: { label: 'Players online', color: 'var(--brand)' },
}
</script>

<template>
	<SectionCards :stats="stats" :loading="pending && !overview" />

	<div class="px-4 lg:px-6">
		<ChartAreaInteractive
			v-model:time-range="range"
			title="Network activity"
			description="Players online across all your servers"
			:data="seriesData"
			:config="chartConfig"
			:loading="pending && !overview"
		/>
	</div>

	<ProjectsDataTable :data="overview?.projects ?? []" :loading="pending && !overview" />
</template>
