<script setup lang="ts">
import { useId } from 'vue';

withDefaults(defineProps<{ size?: number; gradient?: boolean }>(), { size: 22, gradient: false });

const gradientId = `bx-mark-${useId()}`;
</script>

<template>
	<svg
		class="bx-mark"
		:width="size"
		:height="size"
		viewBox="0 0 22 22"
		:fill="gradient ? `url(#${gradientId})` : 'currentColor'"
		shape-rendering="crispEdges"
		aria-hidden="true"
	>
		<defs v-if="gradient">
			<linearGradient :id="gradientId" x1="0" y1="0" x2="1" y2="0">
				<stop offset="0" stop-color="var(--accent)" />
				<stop offset="1" stop-color="var(--accent-2)" />
			</linearGradient>
		</defs>
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
