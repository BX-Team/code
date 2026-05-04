<script setup lang="ts">
import AppSidebar from '@/components/dashboard/AppSidebar.vue'
import SiteHeader from '@/components/dashboard/SiteHeader.vue'
import CreateProjectDialog from '@/components/dashboard/CreateProjectDialog.vue'
import SearchDialog from '@/components/dashboard/SearchDialog.vue'
import ConfirmDialog from '@/components/dashboard/ConfirmDialog.vue'
import { Toaster } from 'vue-sonner'

const sidebarOpen = ref(true)
</script>

<template>
	<div class="app-shell">
		<AppSidebar :open="sidebarOpen" />
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
		<Toaster position="bottom-right" rich-colors />
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
