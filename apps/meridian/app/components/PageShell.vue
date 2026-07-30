<script setup lang="ts">
import { Footer, Navbar } from '@bx-team/ui';
import { computed } from 'vue';
import { openCommandPalette } from '@/composables/useCommandPalette';
import { DISCORD_URL, GITHUB_URL } from '~/config/links';

const { data: session } = await useSession();
const loggedIn = computed(() => !!session.value?.user);
</script>

<template>
	<div class="shell">
		<Navbar
			:discord-href="DISCORD_URL"
			:logged-in="loggedIn"
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
