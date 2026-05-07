<script setup lang="ts">
defineProps<{
  title: string;
  body: string;
}>();
</script>

<template>
	<article class="bx-feature-card">
		<div class="bx-feature-card__icon">
			<slot name="icon" />
		</div>
		<h3 class="bx-feature-card__title">{{ title }}</h3>
		<p class="bx-feature-card__body">{{ body }}</p>
	</article>
</template>

<style scoped>
.bx-feature-card {
	padding: 22px;
	background: var(--bg-1);
	border: 1px solid var(--line);
	border-radius: var(--r-lg);
	transition: border-color 0.2s, background 0.2s;
}

.bx-feature-card:hover {
	border-color: var(--line-2);
	background: var(--bg-2);
}

.bx-feature-card__icon {
	display: inline-grid;
	place-items: center;
	width: 36px;
	height: 36px;
	background: var(--bg-3);
	border: 1px solid var(--line);
	border-radius: 9px;
	color: var(--brand);
}

.bx-feature-card__title {
	margin: 12px 0 6px;
	font: 600 17px/1.4 var(--font-sans);
	color: var(--fg-hi);
}

.bx-feature-card__body {
	margin: 0;
	color: var(--dim);
	font-size: 13.5px;
	line-height: 1.55;
}
</style>
