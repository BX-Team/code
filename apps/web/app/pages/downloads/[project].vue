<script setup lang="ts">
import ApiProjectPage from '@/components/downloads/ApiProjectPage.vue';
import GithubReleasesPage from '@/components/downloads/GithubReleasesPage.vue';
import { findProject } from '~/config/projects';

const route = useRoute();
const key = computed(() => String(route.params.project));
const site = computed(() => findProject(key.value));
</script>

<template>
	<GithubReleasesPage v-if="site?.githubReleases" :key="key" :project="site" />
	<ApiProjectPage v-else :key="key" :project-key="key" />
</template>
