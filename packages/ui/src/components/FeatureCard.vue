<script setup lang="ts">
import type { Component } from 'vue';

withDefaults(
  defineProps<{
    title: string;
    body: string;
    href?: string;
    linkAs?: string | Component;
  }>(),
  { linkAs: 'a' },
);
</script>

<template>
	<component :is="href ? linkAs : 'article'" :href="href" class="bx-feature-card" :class="{ 'bx-feature-card--link': href }">
		<div class="bx-feature-card__icon">
			<slot name="icon" />
		</div>
		<h3 class="bx-feature-card__title">{{ title }}</h3>
		<p class="bx-feature-card__body">{{ body }}</p>
	</component>
</template>

<style scoped>
.bx-feature-card {
	display: flex;
	flex-direction: column;
	gap: var(--s-3);
	padding: var(--s-6);
	background: var(--surface-card);
	border: 1px solid var(--line);
	border-radius: var(--r-1);
}

.bx-feature-card--link {
	color: inherit;
	text-decoration: none;
	transition:
		border-color 0.15s ease,
		background-color 0.15s ease;
}

.bx-feature-card--link:hover {
	border-color: var(--line-2);
	background: var(--surface-2);
}

.bx-feature-card--link:hover .bx-feature-card__icon {
	color: var(--accent);
}

.bx-feature-card__icon {
	display: flex;
	color: var(--mute);
	transition: color 0.15s ease;
}

.bx-feature-card__title {
	margin: 0;
	font: 600 18px/1.3 var(--font-sans);
	letter-spacing: -0.01em;
	color: var(--fg);
}

.bx-feature-card__body {
	margin: 0;
	font: 400 13.5px/1.6 var(--font-mono);
	color: var(--dim);
}
</style>
