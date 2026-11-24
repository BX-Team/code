<script setup lang="ts">
useHead({ title: 'Riven Launcher' });
</script>

<template>
	<h1 class="sr-only">Riven Launcher</h1>
	<AccountSkinSection />
	<div class="rv">
		<AccountFriendsSection />
		<AccountMinecraftSection />
	</div>
</template>

<style scoped>
.rv {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(min(100%, 400px), 1fr));
	gap: var(--s-5);
	align-items: start;
}
</style>
