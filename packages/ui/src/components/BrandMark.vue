<script setup lang="ts">
withDefaults(defineProps<{ size?: number }>(), { size: 22 });
</script>

<template>
	<svg
		class="bx-mark"
		:width="size"
		:height="size"
		viewBox="0 0 22 22"
		fill="currentColor"
		shape-rendering="crispEdges"
		aria-hidden="true"
	>
		<path d="M4 0h18v4H4zM0 4h4v14H0zM18 4h4v14h-4zM8 8h6v6H8zM0 18h18v4H0z" />
	</svg>
</template>

<style scoped>
.bx-mark {
	display: block;
	flex-shrink: 0;
	color: var(--fg);
}
</style>
