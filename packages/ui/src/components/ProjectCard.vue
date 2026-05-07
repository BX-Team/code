<script setup lang="ts">
defineProps<{
  name: string;
  description: string;
  tag: string;
  version?: string;
  href?: string;
}>();
</script>

<template>
	<article class="bx-project-card">
		<a v-if="href" :href="href" class="bx-project-card__overlay" aria-label="View project" />
		<div class="bx-project-card__tag">{{ tag }}</div>
		<div class="bx-project-card__name">{{ name }}</div>
		<div class="bx-project-card__desc">{{ description }}</div>
		<div class="bx-project-card__meta">
			<span v-if="version" class="bx-project-card__version">{{ version }}</span>
			<span class="bx-project-card__github" aria-hidden="true">
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
					<path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
				</svg>
			</span>
		</div>
	</article>
</template>

<style scoped>
.bx-project-card {
	padding: 22px;
	background: var(--bg-1);
	border: 1px solid var(--line);
	border-radius: var(--r-lg);
	position: relative;
	transition: border-color 0.2s;
}

.bx-project-card:hover {
	border-color: var(--brand);
}

.bx-project-card__overlay {
	position: absolute;
	inset: 0;
	border-radius: inherit;
}

.bx-project-card__tag {
	display: inline-block;
	font: 600 10px var(--font-mono);
	padding: 2px 8px;
	border-radius: var(--r-full);
	background: var(--brand-soft-2);
	color: var(--brand-2);
	border: 1px solid color-mix(in oklab, var(--brand-2) 30%, transparent);
	letter-spacing: 0.04em;
	margin-bottom: 14px;
}

.bx-project-card__name {
	font: 600 17px/1.4 var(--font-sans);
	color: var(--fg-hi);
	margin-bottom: 4px;
}

.bx-project-card__desc {
	font-size: 13.5px;
	color: var(--dim);
	line-height: 1.5;
}

.bx-project-card__meta {
	display: flex;
	align-items: center;
	gap: 8px;
	margin-top: 16px;
	padding-top: 14px;
	border-top: 1px solid var(--line);
}

.bx-project-card__version {
	font: 500 11px var(--font-mono);
	color: var(--dim);
	background: var(--bg-3);
	border: 1px solid var(--line);
	border-radius: var(--r-xs);
	padding: 2px 6px;
}

.bx-project-card__github {
	margin-left: auto;
	color: var(--mute);
}
</style>
