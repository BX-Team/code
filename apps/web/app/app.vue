<script setup lang="ts">
const disabledPage = useState<{ message?: string } | null>('disabled-page');
</script>

<template>
	<DisabledPage v-if="disabledPage" :message="disabledPage.message" />
	<template v-else>
		<SiteBanner />
		<NuxtLayout>
			<NuxtRouteAnnouncer />
			<NuxtPage />
		</NuxtLayout>
		<CommandPalette />
	</template>
</template>
