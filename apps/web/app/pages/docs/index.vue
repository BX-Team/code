<script setup lang="ts">
import { ArrowRight, BookOpen, Search } from '@lucide/vue';
import { DISCORD_URL, docsIssueUrl } from '~/config/links';
import { PROJECTS } from '~/config/projects';
import { MARKS } from '~/lib/marks';

definePageMeta({ layout: 'docs' });

useState('docs:toc', () => []);

useHead({
  title: 'Documentation',
  meta: [{ name: 'description', content: 'Guides and references for DivineMC, Quark, NDailyRewards and Riven.' }],
});

interface NavNode {
  title: string;
  path: string;
  children?: NavNode[];
}

// The layout reads the same navigation under this key, so it is fetched once.
const { data: navigation } = await useAsyncData(
  'docs-nav',
  () => queryCollectionNavigation('docs', ['icon', 'badge']),
  {
    default: () => [],
  },
);

/** A folder has no page of its own; it opens on its first page. */
function firstPage(node: NavNode): string {
  return node.children?.length ? firstPage(node.children[0] as NavNode) : node.path;
}

/** The tree is rooted at `/docs`, so a project's node sits a level or more down. */
function findNode(nodes: NavNode[], path: string): NavNode | undefined {
  for (const node of nodes) {
    if (node.path === path) return node;
    const found = node.children && findNode(node.children, path);
    if (found) return found;
  }
  return undefined;
}

function countPages(node: NavNode): number {
  return node.children?.length ? node.children.reduce((n, c) => n + countPages(c), 0) : 1;
}

const projects = computed(() =>
  PROJECTS.filter(p => p.docs && !p.archived).map(project => {
    const node = findNode(navigation.value as NavNode[], project.docs!);
    const sections = (node?.children ?? [])
      .filter(child => child.path !== project.docs)
      .map(child => ({ title: child.title, to: firstPage(child) }));
    return { project, sections, pages: node ? countPages(node) : 0 };
  }),
);

const searchOpen = useState('docs:search', () => false);
</script>

<template>
	<div class="dx">
		<header class="dx__head">
			<h1>Documentation</h1>
			<p>Explore our detailed documentation. Pick a project, or search every page at once.</p>
			<button type="button" class="dx__search" @click="searchOpen = true">
				<Search :size="16" :stroke-width="1.9" />
				<span>Search the documentation</span>
			</button>
		</header>

		<div class="dx__list">
			<article v-for="{ project, sections, pages } in projects" :key="project.slug" class="dx__card">
				<NuxtLink :to="project.docs!" class="dx__top">
					<span class="dx__mark">
						<HomeProjectMark v-if="MARKS[project.slug]" :slug="project.slug" :size="26" />
						<img v-else-if="project.logo" :src="project.logo" alt="" width="26" height="26" />
						<BookOpen v-else :size="18" />
					</span>
					<span class="dx__title">
						<span class="dx__name">
							<h2>{{ project.name }}</h2>
							<span class="dx__tag">{{ project.tag }}</span>
						</span>
						<span class="dx__summary">{{ project.summary }}</span>
					</span>
					<span class="dx__open">
						<span>{{ pages }} pages</span>
						<ArrowRight :size="16" :stroke-width="1.8" />
					</span>
				</NuxtLink>
				<nav v-if="sections.length" class="dx__sections" :aria-label="`${project.name} sections`">
					<NuxtLink v-for="s in sections" :key="s.to" :to="s.to">{{ s.title }}</NuxtLink>
				</nav>
			</article>
		</div>

		<section class="dx__help">
			<div>
				<h2>Can't find what you need?</h2>
				<p>Ask in Discord, or open an issue and we will fill the gap in the docs.</p>
			</div>
			<div class="dx__help-acts">
				<a :href="DISCORD_URL" target="_blank" rel="noopener" class="dx__btn primary">Ask in Discord</a>
				<a :href="docsIssueUrl()" target="_blank" rel="noopener" class="dx__btn">Open an issue</a>
			</div>
		</section>
	</div>
</template>

<style scoped>
.dx {
	max-width: 960px;
	margin: 0 auto;
	padding-bottom: var(--s-12);
}

.dx__head {
	display: flex;
	flex-direction: column;
	gap: 12px;
	margin-bottom: 36px;
}

.dx__head h1 {
	margin: 0;
	font: 900 clamp(34px, 5vw, 52px) / 1.05 var(--font-heading);
	letter-spacing: -0.045em;
	color: var(--fg-hi);
}

.dx__head p {
	margin: 0;
	max-width: 56ch;
	font: 400 15px/1.6 var(--font-sans);
	color: var(--dim);
}

.dx__search {
	display: flex;
	align-items: center;
	gap: 12px;
	max-width: 560px;
	min-height: 48px;
	margin-top: 12px;
	padding: 0 12px 0 16px;
	border: 1px solid var(--line-2);
	border-radius: var(--r-3);
	background: var(--surface-card);
	color: var(--mute);
	font: 400 14px/1 var(--font-sans);
	text-align: left;
	cursor: pointer;
	transition: border-color 0.15s ease, background-color 0.15s ease;
}

.dx__search:hover {
	border-color: var(--rule);
	background: var(--surface-2);
}

.dx__search span {
	flex: 1;
}


.dx__list {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.dx__card {
	border: 1px solid var(--line);
	border-radius: var(--r-4);
	background: var(--surface-card);
	overflow: hidden;
}

.dx__top {
	display: flex;
	align-items: center;
	gap: 16px;
	padding: 20px 22px;
	color: inherit;
	transition: background-color 0.15s ease;
}

.dx__top:hover {
	background: var(--surface-2);
}

.dx__mark {
	display: grid;
	flex: none;
	place-items: center;
	width: 44px;
	height: 44px;
	border: 1px solid var(--line-2);
	border-radius: 11px;
	background: var(--surface-3);
	color: var(--accent);
}

.dx__mark img {
	border-radius: 6px;
}

.dx__title {
	display: flex;
	flex: 1;
	flex-direction: column;
	gap: 4px;
	min-width: 0;
}

.dx__name {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 6px 10px;
}

.dx__name h2 {
	margin: 0;
	font: 700 19px/1.2 var(--font-sans);
	letter-spacing: -0.03em;
	color: var(--fg-hi);
}

.dx__tag {
	display: inline-flex;
	align-items: center;
	height: 22px;
	padding: 0 9px;
	border-radius: var(--r-pill);
	background: var(--surface-3);
	color: var(--dim);
	font: 400 12px/1 var(--font-sans);
}

.dx__summary {
	font: 400 13.5px/1.55 var(--font-sans);
	color: var(--dim);
}

.dx__open {
	display: flex;
	flex: none;
	align-items: center;
	gap: 8px;
	font: 400 12.5px/1 var(--font-mono);
	color: var(--mute);
}

.dx__top:hover .dx__open {
	color: var(--accent);
}

.dx__sections {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
	padding: 14px 22px 18px;
	border-top: 1px solid var(--line);
}

.dx__sections a {
	display: inline-flex;
	align-items: center;
	min-height: 32px;
	padding: 0 12px;
	border: 1px solid var(--line);
	border-radius: var(--r-pill);
	color: var(--dim);
	font: 400 13px/1 var(--font-sans);
	transition: border-color 0.15s ease, color 0.15s ease;
}

.dx__sections a:hover {
	border-color: var(--rule);
	color: var(--fg-hi);
}

.dx__help {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: 16px 24px;
	margin-top: 32px;
	padding: 22px;
	border: 1px solid var(--line);
	border-radius: var(--r-4);
	background:
		radial-gradient(60% 120% at 0% 0%, color-mix(in srgb, var(--accent) 9%, transparent), transparent 70%),
		var(--surface-card);
}

.dx__help h2 {
	margin: 0 0 4px;
	font: 700 17px/1.3 var(--font-sans);
	letter-spacing: -0.02em;
	color: var(--fg-hi);
}

.dx__help p {
	margin: 0;
	font: 400 13.5px/1.55 var(--font-sans);
	color: var(--dim);
}

.dx__help-acts {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
}

.dx__btn {
	display: inline-flex;
	align-items: center;
	min-height: 44px;
	padding: 0 18px;
	border: 1px solid var(--line-2);
	border-radius: var(--r-2);
	color: var(--fg-hi);
	font: 500 13.5px/1 var(--font-sans);
	transition: background-color 0.15s ease;
}

.dx__btn:hover {
	background: var(--surface-2);
}

.dx__btn.primary {
	border-color: var(--fg-hi);
	background: var(--fg-hi);
	color: var(--surface-deep);
}

.dx__btn.primary:hover {
	background: var(--fg);
}

@media (max-width: 640px) {
	.dx__top {
		align-items: flex-start;
		padding: 18px;
	}

	.dx__open span {
		display: none;
	}

	.dx__sections {
		padding: 12px 18px 16px;
	}
}
</style>
