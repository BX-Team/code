<script setup lang="ts">
import type { Project } from '~/config/projects';

defineProps<{ project: Project }>();

const link = resolveComponent('NuxtLink');
const { t } = useI18n();
const sitePath = useSitePath();
</script>

<template>
	<component :is="link" :to="sitePath(`/${project.slug}`)" class="showcase">
		<div class="showcase__head">
			<span class="showcase__title">
				<h2 class="showcase__name">{{ project.name }}</h2>
				<span class="showcase__tag">{{ t(`projects.${project.slug}.tag`) }}</span>
			</span>
			<p class="showcase__summary">{{ t(`projects.${project.slug}.summary`) }}</p>
		</div>
		<div v-if="project.previews[0]" class="showcase__shot">
			<img :src="project.previews[0].src" :alt="t(`projects.${project.slug}.previews.${project.previews[0].id}.alt`)" loading="lazy" />
		</div>
		<div v-else-if="project.terminal" class="showcase__shot showcase__term" aria-hidden="true">
			<span
				v-for="(line, i) in project.terminal"
				:key="i"
				class="showcase__line"
				:class="line.kind && `is-${line.kind}`"
				>{{ line.text }}</span
			>
		</div>
		<span class="showcase__more">{{ t('home.more') }} <span aria-hidden="true">→</span></span>
	</component>
</template>

<style scoped>
.showcase {
	min-width: 0;
	/* Rows shared with the cards beside it, so a summary that wraps longer in one language does not push its shot out of line. */
	display: grid;
	grid-row: span 3;
	grid-template-rows: subgrid;
	gap: var(--s-5);
	padding: var(--s-6);
	border: 1px solid var(--line);
	border-radius: var(--r-4);
	background: var(--surface-card);
	color: var(--fg);
	transition: background-color 0.15s ease;
}

.showcase:hover {
	background: var(--surface-2);
}

.showcase__head {
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.showcase__title {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 10px;
}

.showcase__name {
	margin: 0;
	font: 700 24px/1.15 var(--font-sans);
	letter-spacing: -0.03em;
}

.showcase__tag {
	display: inline-flex;
	align-items: center;
	height: 22px;
	padding: 0 9px;
	border-radius: var(--r-pill);
	background: var(--surface-3);
	color: var(--dim);
	font: 400 12px/1 var(--font-sans);
}

.showcase__summary {
	margin: 0;
	font: 400 14px/1.55 var(--font-sans);
	color: var(--dim);
}

.showcase__shot {
	position: relative;
	overflow: hidden;
	border: 1px solid var(--line);
	border-radius: var(--r-2);
	background: var(--surface-deep);
}

.showcase__shot img {
	display: block;
	width: 100%;
	height: 220px;
	object-fit: cover;
	object-position: top left;
}

.showcase__term {
	min-height: 220px;
	display: flex;
	flex-direction: column;
	justify-content: center;
	gap: 2px;
	padding: 14px 16px;
	font: 400 12.5px/1.6 var(--font-mono);
	color: var(--dim);
}

.showcase__line {
	white-space: pre;
	overflow: hidden;
	text-overflow: ellipsis;
}

.showcase__line.is-command {
	margin-top: 6px;
	color: var(--fg-hi);
}

.showcase__line.is-command:first-child {
	margin-top: 0;
}

/* A comment heads a group of commands, so the gap goes above it instead. */
.showcase__line.is-comment {
	margin-top: 6px;
	color: var(--mute);
}

.showcase__line.is-comment:first-child,
.showcase__line.is-comment + .is-command {
	margin-top: 0;
}

.showcase__line.is-command::before {
	content: "$ ";
	color: var(--accent);
}

.showcase__line.is-add,
.showcase__line.is-ok {
	color: var(--ok);
}

.showcase__line.is-remove {
	color: var(--err);
}

.showcase__line.is-dim {
	color: var(--mute);
}

.showcase__more {
	align-self: end;
	font: 500 14px/1 var(--font-sans);
	color: var(--accent);
}

@media (max-width: 640px) {
	.showcase__shot img {
		height: 160px;
	}

	.showcase__term {
		min-height: 160px;
	}
}
</style>
