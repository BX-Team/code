<script setup lang="ts">
import AppSidebar from '@/components/dashboard/AppSidebar.vue'
import CreateProjectDialog from '@/components/dashboard/CreateProjectDialog.vue'
import SearchDialog from '@/components/dashboard/SearchDialog.vue'
import SiteHeader from '@/components/dashboard/SiteHeader.vue'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
</script>

<template>
	<SidebarProvider
		data-dashboard
		:style="{
			'--sidebar-width': 'calc(var(--spacing) * 72)',
			'--header-height': 'calc(var(--spacing) * 12)',
		}"
	>
		<AppSidebar variant="inset" />
		<SidebarInset>
			<SiteHeader />
			<div class="flex flex-1 flex-col">
				<div class="@container/main flex flex-1 flex-col gap-2">
					<div class="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
						<slot />
					</div>
				</div>
			</div>
		</SidebarInset>
		<CreateProjectDialog />
		<SearchDialog />
	</SidebarProvider>
</template>
