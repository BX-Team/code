<script setup lang="ts">
import type { ProjectSummary, Release } from '@/lib/builds';
import ReleaseCard from './ReleaseCard.vue';

defineProps<{
  project: ProjectSummary;
  releases: Release[];
}>();
</script>

<template>
	<div v-if="releases.length" class="releases">
		<ReleaseCard v-for="r in releases" :key="r.tag" :release="r" :project="project" />
	</div>

	<div v-else class="state">
		<p>No releases published yet.</p>
	</div>
</template>

<style scoped>
.releases { display: flex; flex-direction: column; gap: 12px; }

.state {
	display: grid;
	place-items: center;
	padding: 64px 16px;
	gap: 10px;
	color: var(--mute);
}
</style>
