<script setup lang="ts">
import { Footer, Navbar } from '@bx-team/ui';
import { DISCORD_URL } from '~/config/links';
</script>

<template>
	<div class="shell">
		<Navbar :discord-href="DISCORD_URL" />
		<slot />
		<Footer :discord-href="DISCORD_URL" />
	</div>
</template>

<style scoped>
.shell {
	min-height: 100vh;
	display: flex;
	flex-direction: column;
}
</style>
