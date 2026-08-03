<script setup lang="ts">
import { Footer, Navbar } from '@bx-team/ui';
import { openCommandPalette } from '@/composables/useCommandPalette';
import { DISCORD_URL, GITHUB_URL } from '~/config/links';
</script>

<template>
	<div class="shell">
		<Navbar
			:discord-href="DISCORD_URL"
			search-enabled
			@search="openCommandPalette()"
		/>
		<slot />
		<Footer
			:github-href="GITHUB_URL"
			:discord-href="DISCORD_URL"
		/>
	</div>
</template>

<style scoped>
.shell {
	min-height: 100vh;
	display: flex;
	flex-direction: column;
}
</style>
