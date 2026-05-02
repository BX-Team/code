<script setup lang="ts">
import ChartAreaInteractive from '@/components/dashboard/ChartAreaInteractive.vue';
import ProjectTabs from '@/components/dashboard/ProjectTabs.vue';
import SectionCards from '@/components/dashboard/SectionCards.vue';
import type { ChartConfig } from '@/components/ui/chart';

definePageMeta({ layout: 'dashboard', middleware: 'auth' });

const route = useRoute();
const slug = computed(() => route.params.slug as string);

const { data: projects } = await useProjects();
const project = computed(() => (projects.value ?? []).find(p => p.slug === slug.value) ?? null);

const range = ref<'24h' | '7d' | '30d'>('24h');

interface StatsResponse {
  project: { id: string; name: string; slug: string; type: 'server' | 'plugin' | 'mod' };
  metadata: {
    lastSeenAt: string;
    software: string | null;
    mcVersion: string | null;
    countryCode: string | null;
  } | null;
  timeseries: Array<{ time: string; online?: number; tps?: number; mspt?: number; memory_used?: number }>;
  summary: { totalErrors: number };
  range: '24h' | '7d' | '30d';
}

interface PlayersResponse {
  sessions: Array<{ player_uuid: string; joined_at: string; client_version: string; country_code: string }>;
  summary: { uniquePlayers: number; newPlayers: number };
}

const { data: stats, pending } = await useAsyncData<StatsResponse | null>(
  `project-stats-${slug.value}`,
  () =>
    project.value
      ? $fetch<StatsResponse>(`/api/v3/projects/${project.value.id}/stats`, { query: { range: range.value } })
      : Promise.resolve(null),
  { watch: [range] },
);

const { data: players } = await useAsyncData<PlayersResponse | null>(`project-players-${slug.value}`, () =>
  project.value && project.value.type === 'server'
    ? $fetch<PlayersResponse>(`/api/v3/projects/${project.value.id}/players`)
    : Promise.resolve(null),
);

const seriesData = computed(() => {
  const ts = stats.value?.timeseries ?? [];
  return ts.map(p => ({
    date: new Date(p.time),
    online: Number(p.online ?? 0),
    tps: Number(p.tps ?? 0),
  }));
});

const chartConfig: ChartConfig = {
  online: { label: 'Players online', color: 'var(--primary)' },
  tps: { label: 'TPS', color: 'oklch(0.7 0.18 145)' },
};

const summary = computed(() => {
  const data = seriesData.value;
  if (!data.length) {
    return { peakOnline: 0, avgTps: 0 };
  }
  const peakOnline = Math.max(...data.map(d => d.online));
  const avgTps = data.reduce((sum, d) => sum + d.tps, 0) / data.length;
  return {
    peakOnline,
    avgTps: Math.round(avgTps * 10) / 10,
  };
});

const cardStats = computed(() => {
  if (!project.value) return [];

  const meta = stats.value?.metadata;
  const errs = stats.value?.summary.totalErrors ?? 0;
  const playersSummary = players.value?.summary;

  if (project.value.type === 'server') {
    return [
      {
        label: 'Peak online',
        value: summary.value.peakOnline,
        hint: `Highest concurrent players in the last ${range.value}`,
      },
      {
        label: 'Avg TPS',
        value: summary.value.avgTps || '—',
        hint: '20.0 is healthy',
      },
      {
        label: 'Unique players (24h)',
        value: playersSummary?.uniquePlayers ?? 0,
        hint: `${playersSummary?.newPlayers ?? 0} new players`,
      },
      {
        label: 'Errors',
        value: errs,
        hint: meta?.lastSeenAt
          ? `Last heartbeat ${new Date(meta.lastSeenAt).toLocaleString()}`
          : 'Awaiting first heartbeat',
      },
    ];
  }

  return [
    {
      label: 'Errors',
      value: errs,
      hint: 'Total error groups reported',
    },
    {
      label: 'Type',
      value: project.value.type,
      hint: 'Pulsify project type',
    },
  ];
});
</script>

<template>
	<div v-if="!project" class="px-4 lg:px-6">
		<div class="border rounded-lg p-12 text-center text-muted-foreground">
			Project not found.
		</div>
	</div>
	<template v-else>
		<ProjectTabs :slug="project.slug" :project-type="project.type" />
		<SectionCards :stats="cardStats" :loading="pending" />

		<div v-if="project.type === 'server'" class="px-4 lg:px-6">
			<ChartAreaInteractive
				v-model:time-range="range"
				title="Server activity"
				description="Concurrent players and tick rate"
				:data="seriesData"
				:config="chartConfig"
				:loading="pending"
			/>
		</div>
	</template>
</template>
