<script setup lang="ts">
import type { Component } from 'vue';

withDefaults(
  defineProps<{
    name: string;
    description: string;
    tag: string;
    archived?: boolean;
    href: string;
    linkAs?: string | Component;
  }>(),
  { linkAs: 'a' },
);
</script>

<template>
	<component :is="linkAs" :href="href" class="bx-project-card" :class="{ 'bx-project-card--archived': archived }">
		<div class="bx-project-card__head">
			<h3 class="bx-project-card__name">{{ name }}</h3>
			<span v-if="archived" class="bx-project-card__chip">Archived</span>
			<span v-else class="bx-project-card__tag">{{ tag }}</span>
		</div>
		<p class="bx-project-card__desc">{{ description }}</p>
		<div class="bx-project-card__foot">
			<span class="bx-project-card__more">
				Learn more
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
					<path d="M5 12h14M13 6l6 6-6 6" />
				</svg>
			</span>
		</div>
	</component>
</template>

<style scoped>
.bx-project-card {
	display: flex;
	flex-direction: column;
	gap: var(--s-3);
	padding: var(--s-6);
	background: var(--surface-card);
	border: 1px solid var(--line);
	border-radius: var(--r-1);
	color: inherit;
	text-decoration: none;
	transition:
		border-color 0.15s ease,
		background-color 0.15s ease;
}

.bx-project-card:hover {
	border-color: var(--line-2);
	background: var(--surface-2);
}

.bx-project-card--archived {
	opacity: 0.6;
}

.bx-project-card__head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--s-3);
}

.bx-project-card__name {
	margin: 0;
	font: 600 21px/1.3 var(--font-sans);
	letter-spacing: -0.01em;
	color: var(--fg);
}

.bx-project-card__tag {
	flex-shrink: 0;
	font: 500 11px/1 var(--font-mono);
	padding: 4px 7px;
	border-radius: var(--r-1);
	background: var(--accent-wash);
	color: var(--accent-2);
}

.bx-project-card__desc {
	flex: 1;
	margin: 0;
	font: 400 13.5px/1.6 var(--font-mono);
	color: var(--dim);
}

.bx-project-card__foot {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--s-2);
	padding-top: var(--s-3);
}

.bx-project-card__chip {
	flex-shrink: 0;
	font: 500 11px/1 var(--font-mono);
	letter-spacing: 0.04em;
	padding: 4px 7px;
	border: 1px solid var(--line-2);
	border-radius: var(--r-1);
	background: var(--surface-1);
	color: var(--mute);
}

.bx-project-card__more {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	margin-left: auto;
	font: 400 13px/1 var(--font-mono);
	color: var(--mute);
	transition: color 0.15s ease;
}

.bx-project-card:hover .bx-project-card__more {
	color: var(--accent);
}
</style>
