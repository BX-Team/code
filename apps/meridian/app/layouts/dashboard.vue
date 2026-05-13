<script setup lang="ts">
import { Toaster } from 'vue-sonner';
import AppSidebar from '@/components/dashboard/AppSidebar.vue';
import ConfirmDialog from '@/components/dashboard/ConfirmDialog.vue';
import CreateProjectDialog from '@/components/dashboard/CreateProjectDialog.vue';
import SearchDialog from '@/components/dashboard/SearchDialog.vue';
import SiteHeader from '@/components/dashboard/SiteHeader.vue';

const MOBILE_BP = 820;

const sidebarOpen = ref(true);

onMounted(() => {
  if (window.innerWidth < MOBILE_BP) sidebarOpen.value = false;
});

const route = useRoute();
watch(
  () => route.path,
  () => {
    if (window.innerWidth < MOBILE_BP) sidebarOpen.value = false;
  },
);
</script>

<template>
	<div class="app-shell">
		<AppSidebar :open="sidebarOpen" />
		<Transition name="bd">
			<div v-if="sidebarOpen" class="mob-backdrop" @click="sidebarOpen = false" />
		</Transition>
		<div class="app-main">
			<SiteHeader v-model:sidebar-open="sidebarOpen" />
			<div class="app-scroll">
				<div class="page-sections">
					<slot />
				</div>
			</div>
		</div>
		<CreateProjectDialog />
		<SearchDialog />
		<ConfirmDialog />
		<Teleport to="body">
			<Toaster position="bottom-right" rich-colors theme="dark" />
		</Teleport>
	</div>
</template>

<style scoped>
.app-shell {
	display: flex;
	height: 100dvh;
	overflow: hidden;
	background: var(--bg-0);
	font-family: var(--font-sans);
	font-size: 14px;
	color: var(--fg);
	-webkit-font-smoothing: antialiased;
}

.mob-backdrop {
	display: none;
}

.bd-enter-active,
.bd-leave-active {
	transition: opacity 0.2s ease;
}
.bd-enter-from,
.bd-leave-to {
	opacity: 0;
}

@media (max-width: 820px) {
	.mob-backdrop {
		display: block;
		position: fixed;
		inset: 0;
		z-index: 55;
		background: rgba(0, 0, 0, 0.5);
		-webkit-backdrop-filter: blur(2px);
		backdrop-filter: blur(2px);
	}
}
.app-main {
	display: flex;
	flex-direction: column;
	overflow: hidden;
	min-width: 0;
	flex: 1;
}
.app-scroll {
	overflow-y: auto;
	flex: 1;
}
.app-scroll::-webkit-scrollbar { width: 10px; }
.app-scroll::-webkit-scrollbar-thumb {
	background: var(--bg-2);
	border-radius: 5px;
	border: 2px solid var(--bg-0);
}
.page-sections {
	display: flex;
	flex-direction: column;
	gap: 20px;
	padding: 24px 0 60px;
}
</style>
