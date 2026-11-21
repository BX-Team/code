<script setup lang="ts">
import { PROJECTS } from '~/config/projects';
import { MARKS } from '~/lib/marks';

const props = withDefaults(defineProps<{ slug: string; size?: number }>(), { size: 20 });

const layers = computed(() => MARKS[props.slug]);
const logo = computed(() => (layers.value ? undefined : PROJECTS.find(p => p.slug === props.slug)?.logo));
</script>

<template>
	<svg
		v-if="layers"
		:width="size"
		:height="size"
		viewBox="0 0 16 16"
		shape-rendering="crispEdges"
		aria-hidden="true"
		class="mark"
	>
		<path v-for="(l, i) in layers" :key="i" :d="l.d" :style="{ fill: l.fill }" />
	</svg>
	<img v-else-if="logo" :src="logo" alt="" :width="size" :height="size" class="mark" />
</template>

<style scoped>
.mark {
	flex: none;
}
</style>
