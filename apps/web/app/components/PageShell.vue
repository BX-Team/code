<script setup lang="ts">
import { openCommandPalette } from '@/composables/useCommandPalette';

/** The bar follows the page's container, so the wordmark sits above the content's left edge. */
defineProps<{
  maxWidth?: string;
  gutter?: string;
}>();
</script>

<template>
	<div class="shell">
		<SiteNav :max-width="maxWidth" :gutter="gutter" search-enabled @search="openCommandPalette()" />
		<div class="shell__body">
			<slot />
		</div>
		<SiteFooter />
	</div>
</template>

<style scoped>
.shell {
	min-height: 100vh;
	display: flex;
	flex-direction: column;
	overflow-x: clip;
}

.shell__body {
	flex: 1;
	padding-bottom: var(--s-16);
}
</style>
