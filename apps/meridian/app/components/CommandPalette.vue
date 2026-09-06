<script setup lang="ts">
import {
  BookOpen,
  CornerDownLeft,
  Download,
  FileText,
  Fingerprint,
  FolderGit2,
  Home,
  Search,
  SlidersHorizontal,
  Terminal,
  Users,
  Wrench,
} from '@lucide/vue';
import type { Component } from 'vue';
import { closeCommandPalette, useCommandPaletteOpen } from '@/composables/useCommandPalette';

type Group = 'nav' | 'docs';

interface PaletteItem {
  key: string;
  group: Group;
  title: string;
  subtitle?: string;
  icon: Component;
  hint?: string;
  to?: string;
  href?: string;
}

interface DocSection {
  id: string;
  title: string;
  titles?: string[];
  content?: string;
}

const open = useCommandPaletteOpen();
const query = ref('');
const docsResults = ref<DocSection[]>([]);
const docsLoading = ref(false);
const selectedIdx = ref(0);
const inputRef = ref<HTMLInputElement | null>(null);
const listRef = ref<HTMLDivElement | null>(null);

const navItems: PaletteItem[] = [
  { key: 'nav:home', group: 'nav', title: 'Home', subtitle: '/', icon: Home, to: '/' },
  { key: 'nav:docs', group: 'nav', title: 'Documentation', subtitle: '/docs', icon: BookOpen, to: '/docs' },
  { key: 'nav:downloads', group: 'nav', title: 'Downloads', subtitle: '/downloads', icon: Download, to: '/downloads' },
  { key: 'nav:tools', group: 'nav', title: 'Tools', subtitle: '/tools', icon: Wrench, to: '/tools' },
  {
    key: 'nav:flags',
    group: 'nav',
    title: 'JVM flags generator',
    subtitle: '/tools/flags',
    icon: Terminal,
    to: '/tools/flags',
  },
  {
    key: 'nav:server-config',
    group: 'nav',
    title: 'Server config generator',
    subtitle: '/tools/server-config',
    icon: SlidersHorizontal,
    to: '/tools/server-config',
  },
  {
    key: 'nav:uuid',
    group: 'nav',
    title: 'UUID lookup',
    subtitle: '/tools/uuid',
    icon: Fingerprint,
    to: '/tools/uuid',
  },
  { key: 'nav:team', group: 'nav', title: 'Team', subtitle: '/team', icon: Users, to: '/team' },
];

const docsItems = computed<PaletteItem[]>(() =>
  docsResults.value.map(r => ({
    key: `docs:${r.id}`,
    group: 'docs' as Group,
    title: r.title,
    subtitle: r.titles?.length ? r.titles.join(' › ') : r.content?.slice(0, 80),
    icon: FileText,
    to: r.id,
  })),
);

function matchesQuery(item: PaletteItem, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  return item.title.toLowerCase().includes(needle) || (item.subtitle?.toLowerCase().includes(needle) ?? false);
}

const filteredNav = computed(() => navItems.filter(i => matchesQuery(i, query.value.trim())));

const groups = computed(() => {
  const out: { id: Group; label: string; items: PaletteItem[] }[] = [];
  if (filteredNav.value.length) out.push({ id: 'nav', label: 'Navigation', items: filteredNav.value });
  if (docsItems.value.length) out.push({ id: 'docs', label: 'Documentation', items: docsItems.value });
  return out;
});

const flatItems = computed(() => groups.value.flatMap(g => g.items));

const isEmpty = computed(() => !docsLoading.value && query.value.trim().length > 0 && flatItems.value.length === 0);

function flatIndexOf(item: PaletteItem): number {
  return flatItems.value.findIndex(i => i.key === item.key);
}

function activate(item: PaletteItem) {
  closeCommandPalette();
  if (item.href) {
    window.open(item.href, '_blank', 'noopener,noreferrer');
    return;
  }
  if (item.to) {
    navigateTo(item.to);
  }
}

function activateSelected() {
  const item = flatItems.value[selectedIdx.value];
  if (item) activate(item);
}

function moveSelection(dir: 1 | -1) {
  const total = flatItems.value.length;
  if (total === 0) return;
  selectedIdx.value = (selectedIdx.value + dir + total) % total;
  scrollSelectedIntoView();
}

function scrollSelectedIntoView() {
  nextTick(() => {
    const el = listRef.value?.querySelector('[data-selected="true"]') as HTMLElement | null;
    el?.scrollIntoView({ block: 'nearest' });
  });
}

let debounce: ReturnType<typeof setTimeout> | undefined;

watch(query, q => {
  clearTimeout(debounce);
  selectedIdx.value = 0;
  const trimmed = q.trim();
  if (trimmed.length < 2) {
    docsResults.value = [];
    docsLoading.value = false;
    return;
  }
  docsLoading.value = true;
  debounce = setTimeout(async () => {
    try {
      docsResults.value = await searchDocs(trimmed);
    } catch {
      docsResults.value = [];
    } finally {
      docsLoading.value = false;
    }
  }, 180);
});

watch(open, isOpen => {
  if (!isOpen) return;
  query.value = '';
  docsResults.value = [];
  selectedIdx.value = 0;
  nextTick(() => inputRef.value?.focus());
});

watch(flatItems, items => {
  if (selectedIdx.value >= items.length) selectedIdx.value = Math.max(0, items.length - 1);
});

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

function onGlobalKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.code === 'KeyK') {
    e.preventDefault();
    open.value = !open.value;
    return;
  }
  if (!open.value) {
    if (e.key === '/' && !isEditableTarget(e.target)) {
      e.preventDefault();
      open.value = true;
    }
    return;
  }
  if (e.key === 'Escape') {
    e.preventDefault();
    closeCommandPalette();
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    moveSelection(1);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    moveSelection(-1);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    activateSelected();
  }
}

onMounted(() => window.addEventListener('keydown', onGlobalKeydown));
onUnmounted(() => window.removeEventListener('keydown', onGlobalKeydown));
</script>

<template>
	<Teleport to="body">
		<Transition name="cmdk">
			<div v-if="open" class="cmdk-overlay" @click.self="closeCommandPalette()">
				<div class="cmdk-panel" role="dialog" aria-modal="true" aria-label="Command palette">
					<div class="cmdk-input-row">
						<Search :size="16" :stroke-width="1.7" class="cmdk-input-icon" />
						<input
							ref="inputRef"
							v-model="query"
							class="cmdk-input"
							type="text"
							placeholder="Search docs or jump to a page…"
							autocomplete="off"
							spellcheck="false"
						/>
						<kbd class="cmdk-kbd">ESC</kbd>
					</div>

					<div ref="listRef" class="cmdk-list">
						<template v-for="g in groups" :key="g.id">
							<div class="cmdk-group-label">{{ g.label }}</div>
							<button
								v-for="item in g.items"
								:key="item.key"
								type="button"
								class="cmdk-item"
								:data-selected="flatIndexOf(item) === selectedIdx ? 'true' : 'false'"
								@mouseenter="selectedIdx = flatIndexOf(item)"
								@click="activate(item)"
							>
								<span class="cmdk-item__icon">
									<component :is="item.icon" :size="14" :stroke-width="1.7" />
								</span>
								<span class="cmdk-item__title">{{ item.title }}</span>
								<span v-if="item.subtitle" class="cmdk-item__subtitle">{{ item.subtitle }}</span>
								<span v-if="item.hint" class="cmdk-item__hint">{{ item.hint }}</span>
								<span class="cmdk-item__enter" aria-hidden="true">
									<CornerDownLeft :size="12" :stroke-width="1.8" />
								</span>
							</button>
						</template>

						<div v-if="docsLoading && !groups.length" class="cmdk-state">Searching documentation…</div>
						<div v-else-if="isEmpty" class="cmdk-state">No results for "{{ query }}"</div>
					</div>

					<div class="cmdk-foot">
						<span class="cmdk-foot__it"><kbd class="cmdk-kbd">↑</kbd><kbd class="cmdk-kbd">↓</kbd>navigate</span>
						<span class="cmdk-foot__it"><kbd class="cmdk-kbd">↵</kbd>open</span>
						<span class="cmdk-foot__it"><kbd class="cmdk-kbd">ESC</kbd>close</span>
						<span class="cmdk-foot__spacer" />
						<span class="cmdk-foot__brand">
							<kbd class="cmdk-kbd cmdk-kbd--accent">⌘</kbd><kbd class="cmdk-kbd cmdk-kbd--accent">K</kbd>
						</span>
					</div>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>

<style scoped>
.cmdk-overlay {
	position: fixed;
	inset: 0;
	z-index: 300;
	background: rgba(0, 0, 0, 0.55);
	-webkit-backdrop-filter: blur(6px);
	backdrop-filter: blur(6px);
	display: flex;
	justify-content: center;
	align-items: flex-start;
	padding: clamp(48px, 14vh, 140px) 16px 16px;
}

.cmdk-panel {
	width: 100%;
	max-width: 580px;
	background: color-mix(in oklab, var(--bg-1) 92%, transparent);
	-webkit-backdrop-filter: blur(20px);
	backdrop-filter: blur(20px);
	border: 1px solid var(--line);
	border-radius: 14px;
	box-shadow: var(--shadow-pop);
	overflow: hidden;
	display: flex;
	flex-direction: column;
	max-height: min(560px, 80vh);
}

.cmdk-input-row {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 14px 14px 14px 16px;
	border-bottom: 1px solid var(--line);
	background: linear-gradient(
		to bottom,
		color-mix(in oklab, var(--brand-soft) 24%, transparent),
		transparent
	);
}

.cmdk-input-icon {
	color: var(--brand);
	flex-shrink: 0;
}

.cmdk-input {
	flex: 1;
	min-width: 0;
	background: transparent;
	border: none;
	outline: none;
	font: 500 14.5px var(--font-sans);
	color: var(--fg-hi);
	caret-color: var(--brand);
}

.cmdk-input::placeholder {
	color: var(--mute);
}

.cmdk-kbd {
	font: 600 10px var(--font-mono);
	letter-spacing: 0.06em;
	color: var(--mute);
	background: var(--bg-3);
	border: 1px solid var(--line);
	border-bottom-width: 2px;
	border-radius: 4px;
	padding: 2px 6px;
	min-width: 22px;
	display: inline-grid;
	place-items: center;
}

.cmdk-kbd--accent {
	color: var(--fg-hi);
	background: color-mix(in oklab, var(--brand-soft) 80%, var(--bg-3));
	border-color: color-mix(in oklab, var(--brand) 45%, var(--line));
}

.cmdk-list {
	flex: 1;
	overflow-y: auto;
	padding: 6px;
	scrollbar-width: thin;
	scrollbar-color: var(--line-2) transparent;
}

.cmdk-list::-webkit-scrollbar {
	width: 8px;
}

.cmdk-list::-webkit-scrollbar-thumb {
	background: var(--line-2);
	border-radius: 4px;
}

.cmdk-group-label {
	font: 600 10.5px var(--font-mono);
	letter-spacing: 0.08em;
	text-transform: uppercase;
	color: var(--mute);
	padding: 12px 10px 6px;
}

.cmdk-group-label:first-child {
	padding-top: 6px;
}

.cmdk-item {
	display: grid;
	grid-template-columns: 22px 1fr auto auto;
	align-items: center;
	gap: 10px;
	width: 100%;
	padding: 9px 10px;
	background: transparent;
	border: none;
	border-radius: 8px;
	cursor: pointer;
	text-align: left;
	color: inherit;
	transition: background 0.1s;
}

.cmdk-item[data-selected='true'] {
	background: var(--bg-2);
}

.cmdk-item__icon {
	display: inline-grid;
	place-items: center;
	width: 22px;
	height: 22px;
	border-radius: 6px;
	background: var(--bg-3);
	border: 1px solid var(--line);
	color: var(--dim);
}

.cmdk-item[data-selected='true'] .cmdk-item__icon {
	color: var(--brand);
	border-color: color-mix(in oklab, var(--brand) 40%, var(--line));
	background: var(--brand-soft);
}

.cmdk-item__title {
	font: 500 13.5px var(--font-sans);
	color: var(--fg-hi);
	min-width: 0;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.cmdk-item__subtitle {
	font: 400 12px var(--font-mono);
	color: var(--mute);
	max-width: 240px;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	justify-self: end;
}

.cmdk-item__hint {
	font: 600 10.5px var(--font-mono);
	color: var(--warn);
	background: color-mix(in oklab, var(--warn) 14%, transparent);
	border: 1px solid color-mix(in oklab, var(--warn) 30%, var(--line));
	border-radius: 4px;
	padding: 2px 6px;
	letter-spacing: 0.02em;
}

.cmdk-item__enter {
	display: inline-grid;
	place-items: center;
	width: 22px;
	height: 22px;
	color: var(--mute);
	opacity: 0;
	transition: opacity 0.1s;
}

.cmdk-item[data-selected='true'] .cmdk-item__enter {
	opacity: 1;
	color: var(--brand);
}

.cmdk-state {
	padding: 28px 12px;
	text-align: center;
	font: 400 13px var(--font-sans);
	color: var(--mute);
}

.cmdk-foot {
	display: flex;
	align-items: center;
	gap: 14px;
	padding: 9px 14px;
	border-top: 1px solid var(--line);
	background: color-mix(in oklab, var(--bg-0) 60%, transparent);
	font: 500 11.5px var(--font-mono);
	color: var(--mute);
}

.cmdk-foot__it {
	display: inline-flex;
	align-items: center;
	gap: 5px;
}

.cmdk-foot__spacer {
	flex: 1;
}

.cmdk-foot__brand {
	display: inline-flex;
	gap: 3px;
}

.cmdk-enter-active,
.cmdk-leave-active {
	transition: opacity 0.15s ease;
}

.cmdk-enter-active .cmdk-panel,
.cmdk-leave-active .cmdk-panel {
	transition: transform 0.18s ease, opacity 0.18s ease;
}

.cmdk-enter-from,
.cmdk-leave-to {
	opacity: 0;
}

.cmdk-enter-from .cmdk-panel,
.cmdk-leave-to .cmdk-panel {
	opacity: 0;
	transform: translateY(-8px) scale(0.985);
}

@media (max-width: 640px) {
	.cmdk-overlay {
		padding: 24px 12px 12px;
	}
	.cmdk-panel {
		max-height: calc(100vh - 48px);
	}
	.cmdk-item__subtitle {
		display: none;
	}
	.cmdk-foot__it:nth-child(2) {
		display: none;
	}
}
</style>
