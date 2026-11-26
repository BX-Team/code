<script setup lang="ts">
import type { Project } from '~/config/projects';
import { MARKS } from '~/lib/marks';

const props = defineProps<{ project: Project; color: string }>();

const link = resolveComponent('NuxtLink');
const { t } = useI18n();
const sitePath = useSitePath();

/** A project's own pixel logo when it has one; otherwise an 8×8 glyph drawn here, or nothing. */
const GLYPHS: Record<string, string[]> = {
  'vanilla-reimagined': [
    '########',
    '#.##.#.#',
    '########',
    '#......#',
    '#.#..#.#',
    '#......#',
    '#..#...#',
    '########',
  ],
};

const glyph = computed(() => {
  if (MARKS[props.project.slug]) return null;
  const rows = GLYPHS[props.project.slug];
  if (!rows) return null;
  let d = '';
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) if (row[x] === '#') d += `M${x} ${y}h1v1h-1z`;
  });
  return d;
});
</script>

<template>
	<component :is="link" :to="sitePath(`/${project.slug}`)" class="tile">
		<span class="tile__head">
			<span class="tile__title">
				<HomeProjectMark :slug="project.slug" :size="22" />
				<svg v-if="glyph" width="18" height="18" viewBox="0 0 8 8" shape-rendering="crispEdges" aria-hidden="true">
					<path :d="glyph" :fill="color" />
				</svg>
				<h3 class="tile__name">{{ project.name }}</h3>
			</span>
			<span class="tile__tag">{{ t(`projects.${project.slug}.tag`) }}</span>
		</span>
		<p class="tile__summary">{{ t(`projects.${project.slug}.summary`) }}</p>
	</component>
</template>

<style scoped>
.tile {
	display: flex;
	flex-direction: column;
	gap: 10px;
	padding: 22px;
	border: 1px solid var(--line);
	border-radius: var(--r-4);
	background: var(--surface-card);
	color: var(--fg);
	transition: background-color 0.15s ease;
}

.tile:hover {
	background: var(--surface-2);
}

.tile__head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 10px;
}

.tile__title {
	display: flex;
	align-items: center;
	gap: 10px;
	min-width: 0;
}

.tile__name {
	margin: 0;
	font: 700 18px/1.2 var(--font-sans);
	letter-spacing: -0.02em;
}

.tile__tag {
	flex: none;
	display: inline-flex;
	align-items: center;
	height: 22px;
	padding: 0 9px;
	border: 1px solid var(--line-2);
	border-radius: var(--r-pill);
	background: var(--surface-2);
	color: var(--mute);
	font: 400 12px/1 var(--font-sans);
}

.tile__summary {
	margin: 0;
	font: 400 14px/1.55 var(--font-sans);
	color: var(--mute);
}
</style>
