<script setup lang="ts">
import { PanelLeft, Plus } from '@lucide/vue'
import { openCreateProjectDialog } from '@/composables/useCreateProject'

defineProps<{ sidebarOpen: boolean }>()
const emit = defineEmits<{ 'update:sidebarOpen': [boolean] }>()

const { data: projects } = useProjects()

const route = useRoute()
const currentSlug = computed(() => route.params.slug as string | undefined)
const currentProject = computed(() =>
	currentSlug.value ? (projects.value ?? []).find(p => p.slug === currentSlug.value) : null,
)
</script>

<template>
	<header class="topbar">
		<button class="icon-btn" title="Toggle sidebar" @click="emit('update:sidebarOpen', !sidebarOpen)">
			<PanelLeft :size="16" :stroke-width="1.7" />
		</button>
		<div class="crumbs">
			<span>Dashboard</span>
			<template v-if="currentProject">
				<span class="crumb-sep">/</span>
				<span class="crumb-sub">{{ currentProject.name }}</span>
			</template>
		</div>
		<div class="right">
			<button class="btn-primary" @click="openCreateProjectDialog()">
				<Plus :size="13" :stroke-width="2" />
				New project
			</button>
		</div>
	</header>
</template>

<style scoped>
.topbar {
	display: flex;
	align-items: center;
	padding: 0 20px;
	height: 52px;
	border-bottom: 1px solid var(--line);
	gap: 16px;
	flex-shrink: 0;
}

.crumbs {
	display: flex;
	align-items: center;
	gap: 8px;
	font: 600 14px var(--font-sans);
	color: var(--fg-hi);
}
.crumb-sep { color: var(--mute); font-weight: 400; }
.crumb-sub { color: var(--dim); font-weight: 500; }

.icon-btn {
	display: inline-grid;
	place-items: center;
	width: 32px;
	height: 32px;
	border-radius: 7px;
	border: 1px solid transparent;
	color: var(--dim);
	background: transparent;
	cursor: pointer;
}
.icon-btn:hover { background: rgba(255,255,255,.04); color: var(--fg-hi); border-color: var(--line); }

.right { margin-left: auto; }

.btn-primary {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	padding: 7px 14px;
	font: 500 12.5px var(--font-sans);
	background: var(--brand);
	border: 1px solid var(--brand);
	border-radius: 8px;
	color: var(--bg-0);
	cursor: pointer;
}
.btn-primary:hover { box-shadow: 0 0 0 3px var(--brand-soft); }
</style>
