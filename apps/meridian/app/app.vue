<script setup lang="ts">
const disabledPage = useState<{ message?: string } | null>('disabled-page');
</script>

<template>
	<DisabledPage v-if="disabledPage" :message="disabledPage.message" />
	<NuxtLayout v-else>
		<NuxtRouteAnnouncer />
		<NuxtPage />
	</NuxtLayout>
</template>
