<script setup lang="ts">
import { X, Search, LayoutDashboard } from '@lucide/vue'

const open = useSearchDialogOpen()
const query = ref('')

const { data: projects } = useProjects()

const filtered = computed(() => {
	const q = query.value.toLowerCase().trim()
	if (!q) return projects.value ?? []
	return (projects.value ?? []).filter(p =>
		p.name.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q),
	)
})

function select(slug: string) {
	open.value = false
	query.value = ''
	navigateTo(`/dashboard/${slug}`)
}

function close() {
	open.value = false
	query.value = ''
}

function onKeydown(e: KeyboardEvent) {
	if (e.key === 'Escape' && open.value) close()
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
	<Teleport to="body">
		<Transition name="overlay">
			<div v-if="open" class="overlay" @click.self="close">
				<div class="search-box" role="dialog" aria-modal="true">
					<div class="search-input-wrap">
						<Search :size="16" :stroke-width="1.7" class="search-icon" />
						<input
							v-model="query"
							class="search-input"
							placeholder="Search projects…"
							autofocus
						/>
						<button class="close-btn" @click="close">
							<X :size="14" :stroke-width="1.7" />
						</button>
					</div>
					<div v-if="filtered.length" class="results">
						<button
							v-for="project in filtered"
							:key="project.id"
							class="result-item"
							@click="select(project.slug)"
						>
							<LayoutDashboard :size="14" :stroke-width="1.6" class="result-icon" />
							<span class="result-name">{{ project.name }}</span>
							<span class="result-type">{{ project.type }}</span>
						</button>
					</div>
					<div v-else class="no-results">No projects found</div>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>

<style scoped>
.overlay {
	position: fixed;
	inset: 0;
	background: rgba(0,0,0,.6);
	display: flex;
	align-items: flex-start;
	justify-content: center;
	padding-top: 120px;
	z-index: 100;
	backdrop-filter: blur(4px);
}
.search-box {
	background: var(--bg-1);
	border: 1px solid var(--line);
	border-radius: 12px;
	width: 480px;
	max-width: calc(100vw - 32px);
	overflow: hidden;
	box-shadow: 0 24px 64px rgba(0,0,0,.5);
}
.search-input-wrap {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 14px 16px;
	border-bottom: 1px solid var(--line);
}
.search-icon { color: var(--mute); flex-shrink: 0; }
.search-input {
	flex: 1;
	background: transparent;
	border: none;
	outline: none;
	font: 400 14px var(--font-sans);
	color: var(--fg-hi);
}
.search-input::placeholder { color: var(--mute); }
.close-btn {
	display: inline-grid;
	place-items: center;
	width: 24px; height: 24px;
	border-radius: 5px;
	border: 1px solid var(--line);
	background: var(--bg-2);
	color: var(--dim);
	cursor: pointer;
}

.results { padding: 6px; }
.result-item {
	display: flex;
	align-items: center;
	gap: 10px;
	width: 100%;
	padding: 10px 12px;
	border-radius: 8px;
	border: none;
	background: transparent;
	cursor: pointer;
	text-align: left;
}
.result-item:hover { background: var(--bg-2); }
.result-icon { color: var(--mute); flex-shrink: 0; }
.result-name { font: 500 13px var(--font-sans); color: var(--fg-hi); flex: 1; }
.result-type {
	font: 500 11px var(--font-mono);
	padding: 2px 6px;
	background: var(--bg-3);
	border: 1px solid var(--line);
	border-radius: 4px;
	color: var(--dim);
	text-transform: capitalize;
}
.no-results {
	padding: 24px;
	text-align: center;
	font: 400 13px var(--font-sans);
	color: var(--mute);
}

.overlay-enter-active, .overlay-leave-active { transition: opacity .15s; }
.overlay-enter-from, .overlay-leave-to { opacity: 0; }
</style>
