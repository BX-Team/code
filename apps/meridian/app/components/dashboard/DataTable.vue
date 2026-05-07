<script setup lang="ts">
import type { ColumnDef } from '@tanstack/vue-table';
import { FlexRender, getCoreRowModel, useVueTable } from '@tanstack/vue-table';

const props = defineProps<{
  data: Record<string, any>[];
  columns: ColumnDef<any, any>[];
  loading?: boolean;
  emptyMessage?: string;
}>();

const table = useVueTable({
  get data() {
    return props.data;
  },
  get columns() {
    return props.columns;
  },
  getCoreRowModel: getCoreRowModel(),
});
</script>

<template>
	<div class="tbl-wrap">
		<table class="tbl">
			<thead>
				<tr>
					<th v-for="header in table.getFlatHeaders()" :key="header.id">
						<FlexRender :render="header.column.columnDef.header" :props="header.getContext()" />
					</th>
				</tr>
			</thead>
			<tbody>
				<template v-if="loading">
					<tr v-for="n in 5" :key="n">
						<td v-for="(col, i) in columns" :key="i">
							<span class="skeleton" />
						</td>
					</tr>
				</template>
				<template v-else-if="!data.length">
					<tr>
						<td :colspan="columns.length" class="empty">{{ emptyMessage ?? 'No data.' }}</td>
					</tr>
				</template>
				<template v-else>
					<tr v-for="row in table.getRowModel().rows" :key="row.id">
						<td v-for="cell in row.getVisibleCells()" :key="cell.id">
							<FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
						</td>
					</tr>
				</template>
			</tbody>
		</table>
	</div>
</template>

<style scoped>
.tbl-wrap { overflow-x: auto; }

.tbl {
	width: 100%;
	border-collapse: collapse;
}
.tbl thead th {
	text-align: left;
	padding: 10px 14px;
	font: 500 11px var(--font-mono);
	color: var(--mute);
	text-transform: uppercase;
	letter-spacing: .06em;
	border-bottom: 1px solid var(--line);
	white-space: nowrap;
}
.tbl tbody td {
	padding: 12px 14px;
	border-bottom: 1px solid var(--line);
	font: 400 13px var(--font-sans);
	color: var(--fg);
	vertical-align: middle;
}
.tbl tbody tr:last-child td { border-bottom: 0; }
.tbl tbody tr:hover { background: var(--bg-2); }

.skeleton {
	display: block;
	width: 80px;
	height: 14px;
	border-radius: 4px;
	background: var(--bg-3);
	animation: pulse 1.4s ease-in-out infinite;
}
@keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.4 } }

.empty {
	text-align: center;
	padding: 48px 14px;
	color: var(--mute);
	font: 400 13px var(--font-sans);
}
</style>
