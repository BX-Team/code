<script setup lang="ts">
import { Button } from '@bx-team/ui';
import { openCommandPalette } from '@/composables/useCommandPalette';
import { DISCORD_URL } from '~/config/links';
import { PROJECTS } from '~/config/projects';

const { t } = useI18n();

useHead({
  title: 'BX Team',
  titleTemplate: null,
});

function toProjects(event: MouseEvent) {
  const target = document.getElementById('projects');
  if (!target) return;
  event.preventDefault();
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
}

const live = PROJECTS.filter(p => !p.archived);
const flagship = live.find(p => p.home === 'flagship');
const showcases = live.filter(p => p.home === 'showcase');
const tiles = live.filter(p => p.home === 'tile');

function tileColor(i: number) {
  const t = tiles.length > 1 ? i / (tiles.length - 1) : 0;
  return `color-mix(in srgb, var(--accent-2) ${Math.round(t * 100)}%, var(--accent))`;
}
</script>

<template>
	<div class="home">
		<SiteNav search-enabled @search="openCommandPalette()" />

		<main class="home__main">
			<section class="home__hero">
				<HomeHeroBeams />
				<h1 class="home__title">BX <span class="bx-text-grad">Team</span></h1>
				<p class="home__lede">{{ t('home.lede') }}</p>
				<div class="home__cta">
					<Button variant="primary" size="lg" href="#projects" @click="toProjects">{{ t('home.browse') }}</Button>
					<Button variant="accent" size="lg" :href="DISCORD_URL">{{ t('home.discord') }}</Button>
				</div>
			</section>

			<div id="projects" class="home__projects">
				<HomeFlagshipCard v-if="flagship" :project="flagship" />

				<div v-if="showcases.length" class="home__showcases">
					<HomeShowcaseCard v-for="p in showcases" :key="p.slug" :project="p" />
				</div>

				<div v-if="tiles.length" class="home__rule" role="separator" />

				<div v-if="tiles.length" class="home__tiles">
					<HomeTileCard v-for="(p, i) in tiles" :key="p.slug" :project="p" :color="tileColor(i)" />
				</div>
			</div>

			<HomeCommunityBand />
		</main>

		<SiteFooter />
	</div>
</template>

<style scoped>
.home {
	min-height: 100vh;
	overflow-x: clip;
}

.home__main {
	display: flex;
	flex-direction: column;
	gap: var(--s-6);
	max-width: var(--container);
	margin: 0 auto;
	padding: var(--s-6) var(--s-4) var(--s-16);
}

.home__hero {
	position: relative;
	overflow: hidden;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 22px;
	padding: clamp(56px, 9vw, 112px) var(--s-6);
	border: 1px solid var(--line);
	border-radius: var(--r-4);
	background:
		radial-gradient(60% 90% at 0% 0%, color-mix(in srgb, var(--accent) 14%, transparent), transparent 65%),
		radial-gradient(60% 90% at 100% 100%, color-mix(in srgb, var(--accent-2) 11%, transparent), transparent 65%),
		var(--surface-card);
	text-align: center;
}


.home__title {
	position: relative;
	margin: 0;
	font: 700 clamp(56px, 9vw, 112px) / 0.95 var(--font-sans);
	letter-spacing: -0.04em;
	color: var(--fg);
}

.home__lede {
	position: relative;
	margin: 0;
	max-width: 46ch;
	font: 400 17px/1.6 var(--font-sans);
	color: var(--dim);
	text-wrap: balance;
}

.home__cta {
	position: relative;
	display: flex;
	flex-wrap: wrap;
	justify-content: center;
	gap: 10px;
	margin-top: 6px;
}

.home__projects {
	display: flex;
	flex-direction: column;
	gap: var(--s-6);
	scroll-margin-top: 80px;
}

.home__showcases {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(min(100%, 420px), 1fr));
	gap: var(--s-6);
}

.home__rule {
	height: 1px;
	background: var(--line);
}

.home__tiles {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
	gap: var(--s-6);
}

@media (max-width: 640px) {
	.home__main,
	.home__projects,
	.home__showcases,
	.home__tiles {
		gap: var(--s-4);
	}

	.home__cta {
		flex-direction: column;
		align-items: stretch;
		width: 100%;
	}
}
</style>
