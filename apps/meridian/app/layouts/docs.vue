<script setup lang="ts">
import { BrandMark } from '@bx-team/ui';
import {
  AlertCircle,
  Atom,
  Blocks,
  CalendarClock,
  ChevronDown,
  Clipboard,
  Computer,
  Cuboid,
  Database,
  DollarSign,
  Download,
  EyeOff,
  Files,
  FileText,
  FolderDot,
  GitBranch,
  GitPullRequest,
  Globe,
  Hammer,
  Keyboard,
  Menu,
  MessageCircle,
  MessageCircleQuestion,
  MonitorCog,
  Package,
  Pencil,
  Presentation,
  Radar,
  Repeat,
  Replace,
  Search,
  Shield,
  SquareCode,
  SquareTerminal,
  Table,
  Torus,
  Waypoints,
  Wrench,
  X,
} from '@lucide/vue';
import type { Component } from 'vue';
import discordSvgRaw from '~/assets/external/discord.svg?raw';
import githubSvgRaw from '~/assets/external/github.svg?raw';
import { DISCORD_URL, docsEditUrl, docsIssueUrl } from '~/config/links';

interface TocLink {
  id: string;
  text: string;
  depth: number;
  children?: TocLink[];
}

interface Project {
  id: string;
  title: string;
  description: string;
  icon: Component;
}

const route = useRoute();
const router = useRouter();

const iconMap: Record<string, Component> = {
  Blocks,
  CalendarClock,
  Clipboard,
  Computer,
  Cuboid,
  Database,
  DollarSign,
  Download,
  EyeOff,
  Files,
  FileText,
  FolderDot,
  Globe,
  GitBranch,
  GitPullRequest,
  Hammer,
  Keyboard,
  MessageCircle,
  MessageCircleQuestion,
  MonitorCog,
  Package,
  Presentation,
  Radar,
  Repeat,
  Replace,
  Shield,
  SquareCode,
  SquareTerminal,
  Table,
  Torus,
  Waypoints,
  Wrench,
  Atom,
};

const projects: Project[] = [
  {
    id: 'divinemc',
    title: 'DivineMC',
    description: 'Multi-functional fork of Purpur, focused on flexibility and optimization.',
    icon: Cuboid,
  },
  {
    id: 'ndailyrewards',
    title: 'NDailyRewards',
    description: 'Lightweight plugin to reward players for playing on your server every day.',
    icon: DollarSign,
  },
  {
    id: 'quark',
    title: 'Quark',
    description: 'Runtime dependency management for plugins on Minecraft server platforms.',
    icon: Atom,
  },
];

function getIcon(name?: string): Component {
  if (!name) return FileText;
  const icon = iconMap[name];
  if (!icon && import.meta.dev) {
    console.warn(`[docs] icon "${name}" is not registered in iconMap (app/layouts/docs.vue), falling back to FileText`);
  }
  return icon ?? FileText;
}

const { data: navigation } = await useAsyncData(
  'docs-nav',
  () => queryCollectionNavigation('docs', ['icon', 'badge']),
  { default: () => [] },
);

const toc = useState<TocLink[]>('docs:toc', () => []);
const hideSidebar = computed(() => route.path === '/docs' || route.path === '/docs/');
const docStem = useState<string>('docs:stem', () => '');
const docTitle = useState<string>('docs:title', () => '');

const editUrl = computed(() => (docStem.value ? docsEditUrl(docStem.value) : '#'));
const issueUrl = computed(() => docsIssueUrl(docTitle.value || undefined));

function findNavNode(nodes: any[], targetPath: string): any {
  for (const node of nodes) {
    if (node.path === targetPath) return node;
    if (node.children) {
      const found = findNavNode(node.children, targetPath);
      if (found) return found;
    }
  }
  return null;
}

const switcherOpen = ref(false);
const mobileSidebarOpen = ref(false);
const searchOpen = ref(false);
const searchQuery = ref('');
const searchResults = ref<any[]>([]);
const searchLoading = ref(false);
const selectedResultIndex = ref(-1);
const searchInputRef = ref<HTMLInputElement | null>(null);
const contentRef = ref<HTMLElement | null>(null);
const tocRef = ref<HTMLElement | null>(null);
const activeTocId = ref('');

const currentProjectId = computed(() => {
  const seg = route.path.split('/')[2];
  return projects.find(p => p.id === seg) ? seg : null;
});
const currentProject = computed(() => projects.find(p => p.id === currentProjectId.value) ?? projects[0]!);

const projectEntry = computed(() => {
  if (!navigation.value || !currentProjectId.value) return null;
  return findNavNode(navigation.value, `/docs/${currentProjectId.value}`);
});

const flatToc = computed(() => {
  const result: TocLink[] = [];
  function flatten(links: TocLink[]) {
    for (const link of links) {
      result.push(link);
      if (link.children) flatten(link.children);
    }
  }
  flatten(toc.value);
  return result;
});

const navBlocks = computed(() => {
  const children = ((projectEntry.value as any)?.children || []).filter(
    (s: any) => s.path !== (projectEntry.value as any)?.path,
  );

  const result: any[] = [];
  let leafBuf: any[] = [];

  for (const s of children) {
    if (s.children?.length) {
      if (leafBuf.length) {
        result.push({ type: 'leaves', items: leafBuf });
        leafBuf = [];
      }
      result.push({ type: 'group', ...s });
    } else {
      leafBuf.push(s);
    }
  }
  if (leafBuf.length) result.push({ type: 'leaves', items: leafBuf });
  return result;
});

function isExactActive(path: string) {
  return route.path === path;
}

function closeSwitcher(e: Event) {
  if (!(e.target as Element)?.closest?.('.proj-switcher')) {
    switcherOpen.value = false;
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    searchOpen.value = false;
    mobileSidebarOpen.value = false;
  }
}

function scrollToSection(id: string): boolean {
  const target = document.getElementById(id);
  if (!target) return false;
  if (contentRef.value) {
    contentRef.value.scrollTo({ top: target.offsetTop - 40, behavior: 'smooth' });
  } else {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  history.replaceState(null, '', `#${id}`);
  return true;
}

function handleContentClick(e: MouseEvent) {
  const a = (e.target as Element).closest('a');
  if (!a) return;
  const href = a.getAttribute('href');
  if (!href?.startsWith('#')) return;
  e.preventDefault();
  scrollToSection(href.slice(1));
}

function handleSearchKeydown(e: KeyboardEvent) {
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    selectedResultIndex.value = Math.min(selectedResultIndex.value + 1, searchResults.value.length - 1);
    scrollSelectedIntoView();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    selectedResultIndex.value = Math.max(selectedResultIndex.value - 1, -1);
    scrollSelectedIntoView();
  } else if (e.key === 'Enter' && selectedResultIndex.value >= 0) {
    const result = searchResults.value[selectedResultIndex.value];
    if (result) {
      router.push(result.id);
      searchOpen.value = false;
    }
  }
}

function scrollSelectedIntoView() {
  nextTick(() => {
    const el = document.querySelector('.sr-item.selected') as HTMLElement | null;
    el?.scrollIntoView({ block: 'nearest' });
  });
}

function handleContentScroll() {
  const el = contentRef.value;
  if (!el || !flatToc.value.length) return;
  const y = el.scrollTop + 120;
  let active = flatToc.value[0]?.id || '';
  for (const link of flatToc.value) {
    const section = document.getElementById(link.id);
    if (section && section.offsetTop <= y) active = link.id;
  }
  activeTocId.value = active;
}

watch(activeTocId, id => {
  if (!tocRef.value || !id) return;
  const activeEl = tocRef.value.querySelector(`a[href="#${id}"]`) as HTMLElement | null;
  activeEl?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
});

let searchDebounce: ReturnType<typeof setTimeout>;
watch(searchQuery, q => {
  clearTimeout(searchDebounce);
  selectedResultIndex.value = -1;
  if (!q.trim()) {
    searchResults.value = [];
    searchLoading.value = false;
    return;
  }
  searchLoading.value = true;
  searchDebounce = setTimeout(async () => {
    try {
      searchResults.value = await searchDocs(q);
    } catch {
      searchResults.value = [];
    } finally {
      searchLoading.value = false;
    }
  }, 200);
});

watch(searchOpen, open => {
  if (open) {
    nextTick(() => searchInputRef.value?.focus());
  } else {
    searchQuery.value = '';
    searchResults.value = [];
    searchLoading.value = false;
    selectedResultIndex.value = -1;
  }
});

router.afterEach(to => {
  mobileSidebarOpen.value = false;
  if (to.hash) {
    nextTick(() => {
      const id = to.hash.slice(1);
      if (!scrollToSection(id)) {
        setTimeout(() => scrollToSection(id), 250);
      }
    });
  } else if (contentRef.value) {
    contentRef.value.scrollTop = 0;
  } else {
    window.scrollTo(0, 0);
  }
});

onMounted(() => {
  document.addEventListener('click', closeSwitcher);
  document.addEventListener('keydown', handleKeydown);
  contentRef.value?.addEventListener('scroll', handleContentScroll, { passive: true });
});

onUnmounted(() => {
  document.removeEventListener('click', closeSwitcher);
  document.removeEventListener('keydown', handleKeydown);
  contentRef.value?.removeEventListener('scroll', handleContentScroll);
});
</script>

<template>
	<div class="docs-root">
		<div class="ambient" aria-hidden="true" />

		<header class="topbar">
			<button v-if="!hideSidebar" class="mobile-menu-btn" :aria-label="mobileSidebarOpen ? 'Close menu' : 'Open menu'" @click.stop="mobileSidebarOpen = !mobileSidebarOpen">
				<component :is="mobileSidebarOpen ? X : Menu" :size="18" :stroke-width="1.8" />
			</button>

			<NuxtLink class="brand" to="/">
				<BrandMark :size="22" />
				<span>BX Team</span>
				<span class="ver-tag">DOCS</span>
			</NuxtLink>

			<nav class="top-nav">
				<NuxtLink to="/docs" :class="{ active: route.path.startsWith('/docs') }">Documentation</NuxtLink>
				<NuxtLink to="/downloads">Downloads</NuxtLink>
				<NuxtLink to="/team">Team</NuxtLink>
			</nav>

			<div class="right">
				<button class="search-btn" aria-label="Open search" @click="searchOpen = true">
					<Search :size="14" :stroke-width="2" />
					<span class="q-text">Search docs…</span>
					<span class="kbd-row">
						<kbd class="kbd">Ctrl</kbd>
						<kbd class="kbd">K</kbd>
					</span>
				</button>
				<a class="icon-btn" href="https://github.com/bx-team" target="_blank" rel="noopener" title="GitHub" aria-label="GitHub" @click="umTrackEvent('github_click', { location: 'docs_header' })">
					<span class="raw-icon" v-html="githubSvgRaw" />
				</a>
				<a class="icon-btn" :href="DISCORD_URL" target="_blank" rel="noopener" title="Discord" aria-label="Discord" @click="umTrackEvent('discord_click', { location: 'docs_header' })">
					<span class="raw-icon" v-html="discordSvgRaw" />
				</a>
			</div>
		</header>

		<div class="shell" :class="{ 'no-sidebar': hideSidebar }">
			<Transition name="overlay">
				<div v-if="mobileSidebarOpen" class="mobile-overlay" @click="mobileSidebarOpen = false" />
			</Transition>
			<aside v-if="!hideSidebar" class="side" :class="{ 'mobile-open': mobileSidebarOpen }">
				<div class="proj-switcher">
					<button class="proj-trigger" :aria-expanded="switcherOpen" @click.stop="switcherOpen = !switcherOpen">
						<span class="ic-wrap">
							<component :is="currentProject.icon" :size="13" :stroke-width="1.8" />
						</span>
						<span>{{ currentProject.title }}</span>
						<ChevronDown :size="14" :stroke-width="2" class="chev" :class="{ 'chev-open': switcherOpen }" />
					</button>

					<Transition name="dropdown">
						<div v-if="switcherOpen" class="proj-menu">
							<NuxtLink
								v-for="project in projects"
								:key="project.id"
								:to="`/docs/${project.id}`"
								class="proj-item"
								:class="{ active: project.id === currentProjectId }"
								@click="switcherOpen = false; mobileSidebarOpen = false"
							>
								<span class="ic-wrap">
									<component :is="project.icon" :size="14" :stroke-width="1.8" />
								</span>
								<span>
									<span class="ttl">{{ project.title }}</span>
									<span class="desc">{{ project.description }}</span>
								</span>
								<svg v-if="project.id === currentProjectId" class="check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
									<polyline points="20 6 9 17 4 12" />
								</svg>
							</NuxtLink>
						</div>
					</Transition>
				</div>

				<nav v-if="projectEntry">
					<div class="side-section">
						<NuxtLink
							:to="`/docs/${currentProjectId}`"
							class="nav-item"
							:class="{ active: isExactActive(`/docs/${currentProjectId}`) }"
							@click="mobileSidebarOpen = false"
						>
							<component :is="getIcon((projectEntry as any).icon)" :size="15" :stroke-width="1.8" class="ic" />
							<span>{{ (projectEntry as any).title }}</span>
						</NuxtLink>
					</div>

					<template v-for="block in navBlocks" :key="block.type === 'group' ? block.path : 'leaves-' + block.items?.[0]?.path">
						<div v-if="block.type === 'group'" class="side-section">
							<div class="side-h">{{ block.title }}</div>
							<NuxtLink
								v-for="child in block.children"
								:key="child.path"
								:to="child.path"
								class="nav-item"
								:class="{ active: isExactActive(child.path) }"
								@click="mobileSidebarOpen = false"
							>
								<component :is="getIcon(child.icon)" :size="15" :stroke-width="1.8" class="ic" />
								<span>{{ child.title }}</span>
								<span v-if="child.badge" class="meta">{{ child.badge }}</span>
							</NuxtLink>
						</div>
						<div v-else class="side-section">
							<NuxtLink
								v-for="leaf in block.items"
								:key="leaf.path"
								:to="leaf.path"
								class="nav-item"
								:class="{ active: isExactActive(leaf.path) }"
								@click="mobileSidebarOpen = false"
							>
								<component :is="getIcon(leaf.icon)" :size="15" :stroke-width="1.8" class="ic" />
								<span>{{ leaf.title }}</span>
								<span v-if="leaf.badge" class="meta">{{ leaf.badge }}</span>
							</NuxtLink>
						</div>
					</template>
				</nav>
			</aside>

			<main ref="contentRef" class="content" @click="handleContentClick">
				<slot />
			</main>

			<aside v-if="!hideSidebar && flatToc.length" ref="tocRef" class="toc">
				<div class="toc-h">
					<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
						<line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
					</svg>
					On this page
				</div>
				<ul>
					<li v-for="link in flatToc" :key="link.id">
						<a
							:href="`#${link.id}`"
							:class="{ active: activeTocId === link.id, 'lvl-3': link.depth === 3 }"
							@click.prevent="scrollToSection(link.id)"
						>{{ link.text }}</a>
					</li>
				</ul>
				<div class="toc-foot">
					<a :href="editUrl" target="_blank" rel="noopener">
						<Pencil :size="13" :stroke-width="1.8" />
						Edit on GitHub
					</a>
					<a :href="issueUrl" target="_blank" rel="noopener">
						<AlertCircle :size="13" :stroke-width="1.8" />
						Report an issue
					</a>
					<a :href="DISCORD_URL" target="_blank" rel="noopener">
						<span class="raw-icon raw-icon--sm" v-html="discordSvgRaw" />
						Ask in Discord
					</a>
				</div>
			</aside>
		</div>

		<Transition name="modal">
			<div v-if="searchOpen" class="search-modal" role="dialog" aria-modal="true" aria-label="Search documentation" @click.self="searchOpen = false">
				<div class="search-panel">
					<div class="search-input-row">
						<Search :size="18" :stroke-width="2" />
						<input ref="searchInputRef" v-model="searchQuery" type="text" placeholder="Search documentation…" autocomplete="off" spellcheck="false" @keydown="handleSearchKeydown" />
						<kbd class="esc">ESC</kbd>
					</div>
					<div class="search-results">
						<div v-if="!searchQuery.trim()" class="sr-empty">Start typing to search…</div>
						<div v-else-if="searchLoading" class="sr-empty">Searching…</div>
						<div v-else-if="searchResults.length === 0" class="sr-empty">No results found.</div>
						<template v-else>
							<NuxtLink
								v-for="(result, i) in searchResults"
								:key="result.id"
								:to="result.id"
								class="sr-item"
								:class="{ selected: selectedResultIndex === i }"
								@click="searchOpen = false"
								@mouseenter="selectedResultIndex = i"
							>
								<div class="sr-breadcrumb">{{ result.titles?.join(' › ') || result.title }}</div>
								<div class="sr-title">{{ result.title }}</div>
								<div v-if="result.content" class="sr-snippet">{{ result.content.slice(0, 100) }}…</div>
							</NuxtLink>
						</template>
					</div>
					<div class="search-foot">
						<span class="it"><kbd class="kbd">↑</kbd><kbd class="kbd">↓</kbd> navigate</span>
						<span class="it"><kbd class="kbd">↵</kbd> open</span>
						<span class="it"><kbd class="kbd">ESC</kbd> close</span>
					</div>
				</div>
			</div>
		</Transition>
	</div>
</template>

<style scoped>
*,
*::before,
*::after {
	box-sizing: border-box;
}

.docs-root {
	display: flex;
	flex-direction: column;
	height: 100vh;
	overflow: hidden;
	background: var(--bg-0);
	color: var(--fg);
	font-family: var(--font-sans);
	-webkit-font-smoothing: antialiased;
	font-size: 14.5px;
}

.ambient {
	position: fixed;
	inset: 0 0 auto 0;
	height: 420px;
	pointer-events: none;
	z-index: 0;
	opacity: 0.55;
}
.ambient::before {
	content: "";
	position: absolute;
	top: -200px;
	left: 50%;
	transform: translateX(-50%);
	width: 1000px;
	height: 600px;
	background: radial-gradient(ellipse 50% 45% at 50% 50%, color-mix(in oklab, var(--brand-glow) 60%, var(--brand-glow-2)), transparent 70%);
	filter: blur(80px);
	opacity: 0.35;
}

.topbar {
	position: relative;
	z-index: 10;
	display: flex;
	align-items: center;
	flex-shrink: 0;
	height: 56px;
	padding: 0 24px;
	border-bottom: 1px solid var(--line);
	background: color-mix(in oklab, var(--bg-0) 80%, transparent);
	-webkit-backdrop-filter: blur(14px);
	backdrop-filter: blur(14px);
	gap: 18px;
}

.brand {
	display: flex;
	align-items: center;
	gap: 10px;
	font: 600 14.5px var(--font-sans);
	color: var(--fg-hi);
	letter-spacing: -0.01em;
	text-decoration: none;
	flex-shrink: 0;
}
.raw-icon {
	display: inline-flex;
	align-items: center;
	line-height: 0;
}
.raw-icon--sm :deep(svg) { width: 13px; height: 13px; }

.ver-tag {
	font: 500 10.5px var(--font-mono);
	color: var(--mute);
	background: var(--bg-2);
	border: 1px solid var(--line);
	padding: 2px 7px;
	border-radius: 4px;
	letter-spacing: 0.04em;
	margin-left: 4px;
}

.top-nav { display: flex; gap: 2px; margin-left: 22px; }
.top-nav a {
	padding: 6px 12px;
	font: 500 13px var(--font-sans);
	color: var(--dim);
	border-radius: 6px;
	transition: color 0.15s, background 0.15s;
	text-decoration: none;
}
.top-nav a:hover { color: var(--fg-hi); background: rgba(255, 255, 255, 0.04); }
.top-nav a.active { color: var(--fg-hi); }
.top-nav a.active::after {
	content: "";
	display: block;
	height: 2px;
	margin: 8px -12px -8px;
	background: linear-gradient(90deg, var(--brand), var(--brand-2));
	border-radius: 2px;
}

.right { margin-left: auto; display: flex; align-items: center; gap: 8px; }

.search-btn {
	display: inline-flex;
	align-items: center;
	gap: 10px;
	width: 280px;
	padding: 7px 8px 7px 12px;
	background: var(--bg-1);
	border: 1px solid var(--line);
	border-radius: 8px;
	color: var(--mute);
	font: 400 13px var(--font-sans);
	cursor: pointer;
	transition: border-color 0.15s;
}
.search-btn:hover { border-color: var(--line-2); }
.search-btn .q-text { color: var(--mute); }
.search-btn .kbd-row { margin-left: auto; display: inline-flex; gap: 3px; }

.kbd {
	display: inline-block;
	font: 500 10.5px var(--font-mono);
	padding: 2px 5px;
	background: var(--bg-3);
	border: 1px solid var(--line);
	border-radius: 4px;
	color: var(--dim);
	line-height: 1.1;
}

.icon-btn {
	display: inline-grid;
	place-items: center;
	width: 32px;
	height: 32px;
	border-radius: 7px;
	border: 1px solid transparent;
	color: var(--dim);
	text-decoration: none;
}
.icon-btn:hover { background: rgba(255, 255, 255, 0.04); color: var(--fg-hi); border-color: var(--line); }

.mobile-menu-btn {
	display: none;
	align-items: center;
	justify-content: center;
	width: 36px;
	height: 36px;
	border-radius: 7px;
	border: 1px solid var(--line);
	background: transparent;
	color: var(--dim);
	cursor: pointer;
	flex-shrink: 0;
}
.mobile-menu-btn:hover { color: var(--fg-hi); background: rgba(255, 255, 255, 0.04); }

.shell {
	display: grid;
	grid-template-columns: 280px minmax(0, 1fr) 240px;
	flex: 1;
	overflow: hidden;
	position: relative;
	z-index: 1;
}
.shell.no-sidebar {
	grid-template-columns: minmax(0, 1fr);
}

.side {
	border-right: 1px solid var(--line);
	overflow-y: auto;
	padding: 22px 16px 32px;
	scrollbar-width: thin;
}
.side::-webkit-scrollbar { width: 8px; }
.side::-webkit-scrollbar-thumb { background: var(--bg-2); border-radius: 4px; }

.proj-switcher { position: relative; margin-bottom: 16px; }
.proj-trigger {
	display: flex;
	align-items: center;
	gap: 10px;
	width: 100%;
	padding: 9px 10px;
	background: var(--bg-1);
	border: 1px solid var(--line);
	border-radius: 8px;
	color: var(--fg-hi);
	font: 500 13px var(--font-sans);
	text-align: left;
	cursor: pointer;
	transition: border-color 0.15s;
}
.proj-trigger:hover { border-color: var(--line-2); }
.proj-trigger .ic-wrap {
	display: inline-grid;
	place-items: center;
	width: 22px;
	height: 22px;
	border-radius: 5px;
	background: color-mix(in oklab, var(--brand-soft) 90%, transparent);
	color: var(--brand);
	flex-shrink: 0;
}
.chev { margin-left: auto; color: var(--mute); transition: transform 0.2s; }
.chev-open { transform: rotate(180deg); }

.proj-menu {
	position: absolute;
	top: calc(100% + 6px);
	left: 0;
	right: 0;
	background: var(--bg-1);
	border: 1px solid var(--line);
	border-radius: 10px;
	padding: 6px;
	box-shadow: var(--shadow-card);
	z-index: 20;
}
.proj-item {
	display: grid;
	grid-template-columns: 28px 1fr auto;
	gap: 10px;
	padding: 10px;
	border-radius: 7px;
	cursor: pointer;
	align-items: start;
	text-decoration: none;
	color: inherit;
}
.proj-item:hover { background: rgba(255, 255, 255, 0.04); }
.proj-item .ic-wrap {
	width: 28px;
	height: 28px;
	display: inline-grid;
	place-items: center;
	border-radius: 6px;
	background: var(--bg-2);
	border: 1px solid var(--line);
	color: var(--fg-hi);
	flex-shrink: 0;
}
.proj-item.active .ic-wrap { color: var(--brand); border-color: color-mix(in oklab, var(--brand) 40%, var(--line)); }
.proj-item .ttl { display: block; font: 600 13px var(--font-sans); color: var(--fg-hi); line-height: 1.2; }
.proj-item .desc { display: block; margin-top: 3px; font: 400 12px/1.45 var(--font-sans); color: var(--dim); }
.proj-item .check { color: var(--brand); align-self: center; }

.side-section { margin-top: 18px; }
.side-section:first-of-type { margin-top: 4px; }
.side-h {
	font: 600 11px var(--font-mono);
	letter-spacing: 0.08em;
	text-transform: uppercase;
	color: var(--mute);
	padding: 0 10px 8px;
}
.nav-item {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 7px 10px;
	margin-bottom: 1px;
	border-radius: 6px;
	color: var(--dim);
	font: 500 13px var(--font-sans);
	transition: all 0.12s;
	position: relative;
	text-decoration: none;
}
.nav-item:hover { background: rgba(255, 255, 255, 0.04); color: var(--fg-hi); }
.nav-item.active { background: rgba(255, 255, 255, 0.06); color: var(--fg-hi); }
.nav-item.active::before {
	content: "";
	position: absolute;
	left: -16px;
	top: 50%;
	transform: translateY(-50%);
	width: 2px;
	height: 16px;
	background: linear-gradient(to bottom, var(--brand), var(--brand-2));
	border-radius: 0 2px 2px 0;
}
.nav-item :deep(svg) { width: 15px; height: 15px; flex-shrink: 0; color: var(--mute); }
.nav-item.active :deep(svg) { color: var(--brand); }
.nav-item .meta {
	margin-left: auto;
	font: 500 10px var(--font-mono);
	color: var(--mute);
	background: var(--bg-2);
	border: 1px solid var(--line);
	padding: 1px 5px;
	border-radius: 3px;
	letter-spacing: 0.04em;
}

.content {
	overflow-y: auto;
	padding: 56px 64px 80px;
	scrollbar-gutter: stable;
}
.content::-webkit-scrollbar { width: 10px; }
.content::-webkit-scrollbar-thumb { background: var(--bg-2); border-radius: 5px; border: 2px solid var(--bg-0); }

.toc {
	border-left: 1px solid var(--line);
	padding: 56px 24px 80px 26px;
	overflow-y: auto;
	scrollbar-width: thin;
}
.toc::-webkit-scrollbar { width: 6px; }
.toc::-webkit-scrollbar-thumb { background: var(--bg-2); border-radius: 3px; }
.toc-h {
	display: flex;
	align-items: center;
	gap: 8px;
	font: 600 11px var(--font-mono);
	letter-spacing: 0.08em;
	text-transform: uppercase;
	color: var(--mute);
	margin-bottom: 12px;
}
.toc ul { display: flex; flex-direction: column; gap: 1px; list-style: none; margin: 0; padding: 0; }
.toc a {
	display: block;
	padding: 5px 10px;
	font: 400 12.5px/1.4 var(--font-sans);
	color: var(--mute);
	border-left: 2px solid transparent;
	margin-left: -2px;
	transition: color 0.15s, border-color 0.15s;
	text-decoration: none;
}
.toc a:hover { color: var(--fg-hi); }
.toc a.active { color: var(--fg-hi); border-left-color: var(--brand); }
.toc a.lvl-3 { padding-left: 22px; }
.toc-foot {
	margin-top: 24px;
	padding-top: 16px;
	border-top: 1px solid var(--line);
	display: flex;
	flex-direction: column;
	gap: 6px;
}
.toc-foot a {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	padding: 4px 10px;
	font: 500 12px var(--font-sans);
	color: var(--dim);
	border-left: 2px solid transparent;
	margin-left: -2px;
	text-decoration: none;
}
.toc-foot a:hover { color: var(--fg-hi); }

.mobile-overlay {
	position: fixed;
	inset: 0;
	z-index: 45;
	background: rgba(0, 0, 0, 0.6);
}

.search-modal {
	position: fixed;
	inset: 0;
	z-index: 200;
	background: rgba(0, 0, 0, 0.6);
	-webkit-backdrop-filter: blur(4px);
	backdrop-filter: blur(4px);
	display: flex;
	padding-top: 12vh;
	justify-content: center;
	align-items: flex-start;
}
.search-panel {
	width: min(640px, 92vw);
	background: var(--bg-1);
	border: 1px solid var(--line);
	border-radius: 14px;
	box-shadow: var(--shadow-card);
	overflow: hidden;
}
.search-input-row {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 14px 16px;
	border-bottom: 1px solid var(--line);
}
.search-input-row :deep(svg) { color: var(--mute); flex-shrink: 0; }
.search-input-row input {
	flex: 1;
	background: transparent;
	border: 0;
	outline: 0;
	font: 400 16px var(--font-sans);
	color: var(--fg-hi);
}
.search-input-row input::placeholder { color: var(--mute); }
.esc {
	font: 500 11px var(--font-mono);
	color: var(--dim);
	padding: 3px 8px;
	background: var(--bg-3);
	border: 1px solid var(--line);
	border-radius: 5px;
}
.search-results { max-height: 60vh; overflow-y: auto; padding: 8px; }
.sr-empty { padding: 24px; text-align: center; font: 400 13.5px var(--font-sans); color: var(--mute); }

.sr-item {
	display: block;
	padding: 10px 14px;
	border-radius: 8px;
	text-decoration: none;
	color: inherit;
	transition: background 0.12s;
}
.sr-item:hover, .sr-item.selected { background: rgba(255, 255, 255, 0.05); }
.sr-breadcrumb {
	font: 500 11px var(--font-mono);
	color: var(--mute);
	text-transform: uppercase;
	letter-spacing: 0.06em;
	margin-bottom: 3px;
}
.sr-title { font: 600 14px var(--font-sans); color: var(--fg-hi); }
.sr-snippet { font: 400 12px/1.5 var(--font-sans); color: var(--dim); margin-top: 4px; }

.search-foot {
	display: flex;
	align-items: center;
	gap: 14px;
	padding: 10px 16px;
	border-top: 1px solid var(--line);
	background: var(--bg-0);
	font: 400 11.5px var(--font-sans);
	color: var(--mute);
}
.search-foot .it { display: inline-flex; align-items: center; gap: 6px; }

.overlay-enter-active, .overlay-leave-active { transition: opacity 0.2s; }
.overlay-enter-from, .overlay-leave-to { opacity: 0; }

.dropdown-enter-active, .dropdown-leave-active { transition: opacity 0.15s, transform 0.15s; }
.dropdown-enter-from, .dropdown-leave-to { opacity: 0; transform: translateY(-6px); }

.modal-enter-active, .modal-leave-active { transition: opacity 0.2s; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-active .search-panel, .modal-leave-active .search-panel { transition: transform 0.2s; }
.modal-enter-from .search-panel, .modal-leave-to .search-panel { transform: translateY(-12px); }

@media (max-width: 1180px) {
	.shell { grid-template-columns: 260px minmax(0, 1fr); }
	.shell.no-sidebar { grid-template-columns: minmax(0, 1fr); }
	.toc { display: none; }
}

@media (max-width: 820px) {
	.docs-root { height: auto; overflow: visible; }
	.shell { display: block; overflow: visible; }
	.shell.no-sidebar { display: block; }

	.side {
		position: fixed;
		top: 56px;
		left: -290px;
		width: 280px;
		height: calc(100vh - 56px);
		z-index: 50;
		background: var(--bg-0);
		border-right: 1px solid var(--line);
		overflow-y: auto;
		transition: left 0.25s ease;
		padding: 22px 16px 32px;
	}
	.side.mobile-open { left: 0; }

	.content { overflow-y: visible; padding: 32px 20px 60px; }

	.topbar { padding: 0 16px; gap: 12px; }
	.top-nav { display: none; }
	.mobile-menu-btn { display: flex; }
	.search-btn {
		width: 40px;
		padding: 7px;
		justify-content: center;
	}
	.search-btn .q-text, .search-btn .kbd-row { display: none; }
	.icon-btn { display: none; }
}
</style>
