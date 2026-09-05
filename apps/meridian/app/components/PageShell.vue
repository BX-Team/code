<script setup lang="ts">
import { Footer } from '@bx-team/ui';
import { openCommandPalette } from '@/composables/useCommandPalette';

/** The bar's row follows the page's own container, so the wordmark sits above the
 *  left edge of the content rather than the viewport's. */
defineProps<{ maxWidth?: string; gutter?: string }>();

import { DISCORD_URL, GITHUB_URL } from '~/config/links';
</script>

<template>
	<div class="shell">
		<SiteNav :max-width="maxWidth" :gutter="gutter" search-enabled @search="openCommandPalette()" />
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
