<script setup lang="ts">
import githubSvgRaw from '~/assets/external/github.svg?raw';

defineProps<{ size?: number }>();
</script>

<template>
	<span class="gh" :style="{ width: `${size ?? 18}px`, height: `${size ?? 18}px` }" v-html="githubSvgRaw" />
</template>

<style scoped>
.gh {
	display: inline-flex;
	line-height: 0;
}

.gh :deep(svg) {
	width: 100%;
	height: 100%;
}
</style>
