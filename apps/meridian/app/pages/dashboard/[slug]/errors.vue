<script setup lang="ts">
import { type ColumnDef, h } from '#imports';
import DataTable from '@/components/dashboard/DataTable.vue';
import ProjectTabs from '@/components/dashboard/ProjectTabs.vue';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

definePageMeta({ layout: 'dashboard', middleware: 'auth' });

interface ErrorRow {
  id: string;
  plugin: string;
  message: string;
  stacktrace: string;
  level: string;
  count: number;
  firstSeenAt: string;
  lastSeenAt: string;
}

interface ErrorsResponse {
  errors: ErrorRow[];
  total: number;
}

const route = useRoute();
const slug = computed(() => route.params.slug as string);

const { data: projects } = await useProjects();
const project = computed(() => (projects.value ?? []).find(p => p.slug === slug.value) ?? null);

const { data, pending } = await useAsyncData<ErrorsResponse | null>(`project-errors-${slug.value}`, () =>
  project.value ? $fetch<ErrorsResponse>(`/api/v3/projects/${project.value.id}/errors`) : Promise.resolve(null),
);

const levelVariant = (level: string) => {
  if (level === 'fatal') return 'destructive';
  if (level === 'error') return 'destructive';
  if (level === 'warning') return 'secondary';
  return 'outline';
};

const columns: ColumnDef<ErrorRow, any>[] = [
  {
    accessorKey: 'level',
    header: 'Level',
    cell: ({ row }) => {
      const level = row.getValue<string>('level');
      return h(Badge, { variant: levelVariant(level), class: 'capitalize' }, () => level);
    },
  },
  {
    accessorKey: 'plugin',
    header: 'Plugin',
    cell: ({ row }) => h('span', { class: 'font-mono text-xs' }, row.getValue<string>('plugin') || '—'),
  },
  {
    accessorKey: 'message',
    header: 'Message',
    cell: ({ row }) =>
      h(
        'span',
        { class: 'block max-w-md truncate', title: row.getValue<string>('message') },
        row.getValue<string>('message'),
      ),
  },
  {
    accessorKey: 'count',
    header: 'Count',
    cell: ({ row }) => h('span', { class: 'tabular-nums font-medium' }, row.getValue<number>('count')),
  },
  {
    accessorKey: 'lastSeenAt',
    header: 'Last seen',
    cell: ({ row }) => {
      const value = row.getValue<string>('lastSeenAt');
      return h('span', { class: 'text-muted-foreground' }, value ? new Date(value).toLocaleString() : '—');
    },
  },
];
</script>

<template>
	<div v-if="!project" class="px-4 lg:px-6">
		<div class="border rounded-lg p-12 text-center text-muted-foreground">
			Project not found.
		</div>
	</div>
	<template v-else>
		<ProjectTabs :slug="project.slug" :project-type="project.type" />
		<div class="px-4 lg:px-6">
			<Card>
				<CardHeader>
					<CardTitle>Errors ({{ data?.total ?? 0 }})</CardTitle>
				</CardHeader>
				<CardContent>
					<DataTable
						:data="data?.errors ?? []"
						:columns="columns"
						:loading="pending"
						empty-message="No errors reported. Nice."
					/>
				</CardContent>
			</Card>
		</div>
	</template>
</template>
