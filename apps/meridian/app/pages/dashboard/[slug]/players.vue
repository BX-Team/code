<script setup lang="ts">
import { type ColumnDef, h } from '#imports';
import DataTable from '@/components/dashboard/DataTable.vue';
import ProjectTabs from '@/components/dashboard/ProjectTabs.vue';
import SectionCards from '@/components/dashboard/SectionCards.vue';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

definePageMeta({ layout: 'dashboard', middleware: 'auth' });

interface PlayerSession {
  player_uuid: string;
  joined_at: string;
  client_version: string;
  country_code: string;
}

interface PlayersResponse {
  sessions: PlayerSession[];
  summary: { uniquePlayers: number; newPlayers: number };
}

const route = useRoute();
const slug = computed(() => route.params.slug as string);

const { data: projects } = await useProjects();
const project = computed(() => (projects.value ?? []).find(p => p.slug === slug.value) ?? null);

const { data, pending } = await useAsyncData<PlayersResponse | null>(`project-players-page-${slug.value}`, () =>
  project.value ? $fetch<PlayersResponse>(`/api/v3/projects/${project.value.id}/players`) : Promise.resolve(null),
);

const columns: ColumnDef<PlayerSession, any>[] = [
  {
    accessorKey: 'player_uuid',
    header: 'Player UUID',
    cell: ({ row }) => h('span', { class: 'font-mono text-xs' }, row.getValue<string>('player_uuid')),
  },
  {
    accessorKey: 'client_version',
    header: 'Client',
    cell: ({ row }) => h('span', {}, row.getValue<string>('client_version') || '—'),
  },
  {
    accessorKey: 'country_code',
    header: 'Country',
    cell: ({ row }) => h('span', { class: 'tabular-nums uppercase' }, row.getValue<string>('country_code') || '—'),
  },
  {
    accessorKey: 'joined_at',
    header: 'Joined',
    cell: ({ row }) => {
      const value = row.getValue<string>('joined_at');
      return h('span', { class: 'text-muted-foreground' }, value ? new Date(value).toLocaleString() : '—');
    },
  },
];

const stats = computed(() => [
  {
    label: 'Unique players (24h)',
    value: data.value?.summary.uniquePlayers ?? 0,
    hint: 'Distinct UUIDs joined in the last 24 hours',
  },
  {
    label: 'New players (24h)',
    value: data.value?.summary.newPlayers ?? 0,
    hint: 'Never seen on this server before',
  },
]);
</script>

<template>
	<div v-if="!project" class="px-4 lg:px-6">
		<div class="border rounded-lg p-12 text-center text-muted-foreground">
			Project not found.
		</div>
	</div>
	<template v-else>
		<ProjectTabs :slug="project.slug" :project-type="project.type" />
		<SectionCards :stats="stats" :loading="pending" />
		<div class="px-4 lg:px-6">
			<Card>
				<CardHeader>
					<CardTitle>Recent sessions</CardTitle>
				</CardHeader>
				<CardContent>
					<DataTable
						:data="data?.sessions ?? []"
						:columns="columns"
						:loading="pending"
						empty-message="No player sessions in the last 24 hours."
					/>
				</CardContent>
			</Card>
		</div>
	</template>
</template>
