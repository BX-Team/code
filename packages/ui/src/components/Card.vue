<script setup lang="ts">
defineProps<{
  featured?: boolean;
  padding?: 'sm' | 'md' | 'lg';
}>();
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
	background: var(--surface-card);
	border: 1px solid var(--line);
	border-radius: var(--r-1);
}

.bx-card--featured {
	border-color: var(--edge);
}

.bx-card--pad-sm { padding: var(--s-3); }
.bx-card--pad-md { padding: var(--s-4); }
.bx-card--pad-lg { padding: var(--s-6); }
</style>
