<script setup lang="ts">
import { Button, Hero, ProjectCard, Section } from '@bx-team/ui';
import { ArrowDown, BookOpen } from '@lucide/vue';
import { openCommandPalette } from '@/composables/useCommandPalette';
import { PROJECTS } from '~/config/projects';
import { useGithubRepos } from '~/lib/github';

useHead({
  title: 'BX Team',
  titleTemplate: null,
});

const link = resolveComponent('NuxtLink');

const { data: repos } = await useGithubRepos(
  'home',
  PROJECTS.map(p => p.repo),
);

function toProjects(event: MouseEvent) {
  const target = document.getElementById('projects');
  if (!target) return;
  event.preventDefault();
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
}

const projects = computed(() => [...PROJECTS].sort((a, b) => Number(!!a.archived) - Number(!!b.archived)));
</script>

<template>
	<div class="home">
		<SiteNav overlay search-enabled @search="openCommandPalette()" />

		<main>
			<Hero lede="An open source community building server software, plugins and developer tools for Minecraft — and a few things beyond it.">
				<template #title>
					Open-source software for <span class="bx-accent">Minecraft servers</span>
				</template>
				<template #cta>
					<Button variant="primary" href="#projects" @click="toProjects">
						<ArrowDown :size="16" :stroke-width="1.7" />
						Our projects
					</Button>
					<Button variant="secondary" href="/docs">
						<BookOpen :size="16" :stroke-width="1.7" />
						Documentation
					</Button>
				</template>
			</Hero>

			<Section
				id="projects"
				title="Everything we maintain"
				lede="A server fork, a library, plugins and the tools around them. Open any of them for its features, previews and how to get started."
			>
				<template #action>
					<a class="bx-link home__all" href="https://github.com/BX-Team" target="_blank" rel="noopener">All repositories →</a>
				</template>

				<div class="home__grid">
					<ProjectCard
						v-for="p in projects"
						:key="p.slug"
						:name="p.name"
						:description="p.summary"
						:tag="p.tag"
						:version="p.githubRelease === false ? undefined : (repos[p.repo]?.version ?? undefined)"
						:archived="p.archived"
						:href="`/${p.slug}`"
						:link-as="link"
					/>
				</div>
			</Section>
		</main>

		<SiteFooter />
	</div>
</template>

<style scoped>
.home {
	min-height: 100vh;
	overflow-x: clip;
}

.home__all {
	font-size: 13.5px;
	white-space: nowrap;
}

.home__grid {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: var(--s-6);
}

@media (max-width: 640px) {
	.home__grid {
		grid-template-columns: 1fr;
		gap: var(--s-4);
	}
}
</style>
