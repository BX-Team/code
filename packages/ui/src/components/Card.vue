<script setup lang="ts">
defineProps<{
	featured?: boolean
	padding?: 'sm' | 'md' | 'lg'
}>()
</script>

<template>
	<div
		class="bx-card"
		:class="[
			featured && 'bx-card--featured',
			`bx-card--pad-${padding ?? 'md'}`,
		]"
	>
		<slot />
	</div>
</template>

<style scoped>
.bx-card {
	background: var(--bg-1);
	border: 1px solid var(--line);
	border-radius: var(--r-lg);
}

.bx-card--featured {
	border-color: color-mix(in oklab, var(--brand) 50%, var(--line));
	box-shadow: 0 0 32px -10px var(--brand-soft);
}

.bx-card--pad-sm { padding: 12px; }
.bx-card--pad-md { padding: 16px; }
.bx-card--pad-lg { padding: 24px; }
</style>
