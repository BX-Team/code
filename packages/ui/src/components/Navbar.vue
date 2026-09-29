<script setup lang="ts">
import { type Component, computed, onBeforeUnmount, onMounted, ref } from 'vue';
import BrandMark from './BrandMark.vue';

export interface NavLink {
  id: string;
  label: string;
  href?: string;
}

const props = withDefaults(
  defineProps<{
    active?: string;
    links?: NavLink[];
    brandHref?: string;
    /** Section badge next to the wordmark, e.g. `DOCS`. */
    tag?: string;
    githubHref?: string;
    discordHref?: string;
    searchEnabled?: boolean;
    searchLabel?: string;
    /** Width of the bar's row — give it the page's own container so the wordmark
     *  lines up with the content under it. `none` spans the viewport. */
    maxWidth?: string;
    gutter?: string;
    /** `NuxtLink` keeps navigation client-side; a plain anchor reloads the page. */
    linkAs?: string | Component;
    overlay?: boolean;
  }>(),
  {
    active: '',
    links: () => [
      { id: 'documentation', label: 'Documentation', href: '/docs' },
      { id: 'downloads', label: 'Downloads', href: '/downloads' },
      { id: 'team', label: 'Team', href: '/team' },
    ],
    brandHref: '/',
    githubHref: 'https://github.com/BX-Team',
    discordHref: 'https://discord.gg/qNyybSSPm5',
    searchEnabled: false,
    searchLabel: 'Search…',
    maxWidth: '1180px',
    gutter: '32px',
    linkAs: 'a',
  },
);

const emit = defineEmits<{
  navigate: [id: string];
  search: [];
}>();

const isMac = ref(false);
const menuOpen = ref(false);
const overBand = ref(props.overlay);
const clear = computed(() => props.overlay && overBand.value && !menuOpen.value);
const kbdLabel = computed(() => (isMac.value ? '⌘K' : 'Ctrl K'));

const header = ref<HTMLElement | null>(null);
let observer: IntersectionObserver | undefined;

const onKey = (e: KeyboardEvent) => {
  if (e.key === 'Escape') menuOpen.value = false;
};

onMounted(() => {
  isMac.value = /Mac|iPhone|iPad|iPod/i.test(navigator.platform);
  window.addEventListener('keydown', onKey);

  const band = props.overlay ? document.querySelector('[data-nav-overlay]') : null;
  if (!band || !header.value) {
    overBand.value = false;
    return;
  }
  const height = header.value.getBoundingClientRect().height;
  observer = new IntersectionObserver(([entry]) => (overBand.value = entry.isIntersecting), {
    rootMargin: `-${height}px 0px 0px 0px`,
  });
  observer.observe(band);
});

onBeforeUnmount(() => {
  observer?.disconnect();
  window.removeEventListener('keydown', onKey);
});

function go(id: string) {
  menuOpen.value = false;
  emit('navigate', id);
}

function openSearch() {
  menuOpen.value = false;
  emit('search');
}
</script>

<template>
	<header
		ref="header"
		class="bx-nav"
		:class="{ 'bx-nav--clear': clear, 'bx-nav--open': menuOpen }"
		:style="{ '--bx-nav-max': maxWidth, '--bx-nav-pad': gutter }"
	>
		<div class="bx-nav__row">
			<span v-if="$slots.lead" class="bx-nav__lead">
				<slot name="lead" />
			</span>

			<component :is="linkAs" :href="brandHref" class="bx-nav__brand" aria-label="BX Team home">
				<BrandMark :size="22" />
				<span class="bx-nav__name">BX Team</span>
				<span v-if="tag" class="bx-nav__tag">{{ tag }}</span>
			</component>

			<nav class="bx-nav__links" aria-label="Main">
				<component
					:is="linkAs"
					v-for="link in links"
					:key="link.id"
					:href="link.href"
					class="bx-nav__link"
					:class="{ 'bx-nav__link--active': active === link.id }"
					:aria-current="active === link.id ? 'page' : undefined"
					@click="emit('navigate', link.id)"
				>
					{{ link.label }}
				</component>
			</nav>

			<div class="bx-nav__right">
				<button
					v-if="searchEnabled"
					type="button"
					class="bx-nav__search"
					aria-label="Open search"
					@click="emit('search')"
				>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
						<circle cx="11" cy="11" r="7" />
						<path d="m20 20-3.5-3.5" />
					</svg>
					<span class="bx-nav__search-text">{{ searchLabel }}</span>
					<kbd class="bx-nav__kbd">{{ kbdLabel }}</kbd>
				</button>

				<slot name="right" />

				<button
					type="button"
					class="bx-nav__toggle"
					:class="{ 'bx-nav__toggle--open': menuOpen }"
					aria-controls="bx-nav-menu"
					:aria-expanded="menuOpen"
					:aria-label="menuOpen ? 'Close menu' : 'Menu'"
					@click="menuOpen = !menuOpen"
				>
					<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" aria-hidden="true">
						<line class="bx-nav__bar bx-nav__bar--top" x1="2.75" y1="5.75" x2="21.25" y2="5.75" />
						<line class="bx-nav__bar bx-nav__bar--mid" x1="2.75" y1="12" x2="21.25" y2="12" />
						<line class="bx-nav__bar bx-nav__bar--bot" x1="2.75" y1="18.25" x2="21.25" y2="18.25" />
					</svg>
				</button>
			</div>
		</div>

		<div v-if="menuOpen" class="bx-nav__scrim" aria-hidden="true" @click="menuOpen = false" />

		<div id="bx-nav-menu" class="bx-nav__menu" :hidden="!menuOpen">
			<nav class="bx-nav__menu-inner" aria-label="Main pages">
				<component
					:is="linkAs"
					v-for="link in links"
					:key="link.id"
					:href="link.href"
					class="bx-nav__menu-link"
					:class="{ 'bx-nav__menu-link--active': active === link.id }"
					:aria-current="active === link.id ? 'page' : undefined"
					@click="go(link.id)"
				>
					{{ link.label }}
				</component>

				<button v-if="searchEnabled" type="button" class="bx-nav__menu-search" @click="openSearch">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
						<circle cx="11" cy="11" r="7" />
						<path d="m20 20-3.5-3.5" />
					</svg>
					Search BX Team
				</button>

				<div class="bx-nav__menu-actions">
					<a :href="githubHref" class="bx-nav__menu-btn" target="_blank" rel="noopener" @click="menuOpen = false">
						<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
							<path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
						</svg>
						GitHub
					</a>
					<a :href="discordHref" class="bx-nav__menu-btn" target="_blank" rel="noopener" @click="menuOpen = false">
						<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
							<path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.032.054a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
						</svg>
						Discord
					</a>
				</div>
			</nav>
		</div>
	</header>
</template>

<style scoped>
.bx-nav {
	position: sticky;
	top: 0;
	z-index: 40;
	flex: 0 0 auto;
	height: 56px;
	border-bottom: 1px solid var(--line);
	background: var(--surface-deep);
	transition:
		background-color 0.15s ease,
		border-color 0.15s ease;
}

.bx-nav--clear {
	background: transparent;
	border-bottom-color: transparent;
}

.bx-nav__row {
	display: flex;
	align-items: center;
	gap: var(--s-6);
	height: 100%;
	max-width: var(--bx-nav-max);
	margin: 0 auto;
	padding: 0 var(--bx-nav-pad);
}

/* `contents`, not `flex`: a hidden toggle would still leave the row's gap in front
   of the wordmark, pushing it off the edge on the sections that have a sidebar. */
.bx-nav__lead {
	display: contents;
}

.bx-nav__brand {
	display: flex;
	align-items: center;
	gap: 10px;
	flex: 0 0 auto;
	font: 600 15px var(--font-sans);
	letter-spacing: -0.01em;
	color: var(--fg-hi);
	text-decoration: none;
}

.bx-nav__name {
	transition: opacity 0.15s ease;
}

.bx-nav__tag {
	font: 500 10.5px/1 var(--font-mono);
	letter-spacing: 0.08em;
	color: var(--mute);
	background: var(--surface-1);
	border: 1px solid var(--line-2);
	border-radius: var(--r-1);
	padding: 4px 7px;
}

.bx-nav__links {
	display: flex;
	gap: var(--s-1);
	margin-left: -12px;
}

.bx-nav__link {
	padding: 8px var(--s-3);
	border-radius: var(--r-1);
	font: 400 14px/1 var(--font-mono);
	color: var(--dim);
	text-decoration: none;
	transition:
		color 0.15s ease,
		background-color 0.15s ease;
}

.bx-nav__link:hover {
	color: var(--fg-hi);
	background: var(--surface-2);
}

.bx-nav__link--active {
	color: var(--fg);
	background: var(--surface-2);
}

.bx-nav__right {
	display: flex;
	align-items: center;
	gap: var(--s-1);
	margin-left: auto;
}

.bx-nav__search {
	display: inline-flex;
	align-items: center;
	gap: var(--s-2);
	height: 32px;
	min-width: 230px;
	padding: 0 var(--s-2) 0 var(--s-3);
	margin-right: var(--s-1);
	background: var(--surface-2);
	border: 1px solid var(--line-2);
	border-radius: var(--r-1);
	color: var(--mute);
	font: 400 13px/1 var(--font-mono);
	cursor: pointer;
	transition:
		border-color 0.15s ease,
		background-color 0.15s ease,
		color 0.15s ease;
}

.bx-nav__search:hover {
	border-color: var(--rule);
	background: var(--surface-3);
	color: var(--dim);
}

.bx-nav__search svg {
	flex-shrink: 0;
}

.bx-nav__search-text {
	flex: 1;
	text-align: left;
}

.bx-nav__kbd {
	font: 500 11px/1 var(--font-mono);
	color: var(--mute);
	background: var(--surface-3);
	border-radius: var(--r-1);
	padding: 4px 6px;
}

.bx-nav__toggle {
	position: relative;
	display: none;
	place-items: center;
	width: 40px;
	height: 40px;
	margin-right: -8px;
	padding: 0;
	background: transparent;
	border: none;
	border-radius: var(--r-1);
	color: var(--dim);
	cursor: pointer;
	transition: color 0.15s ease;
}

.bx-nav__toggle:hover {
	color: var(--fg-hi);
}

.bx-nav__bar {
	transition:
		transform 0.2s cubic-bezier(0.2, 0, 0, 1),
		opacity 0.14s ease-out;
}

.bx-nav__bar--top {
	transform-origin: 12px 5.75px;
}

.bx-nav__bar--mid {
	transform-origin: 12px 12px;
}

.bx-nav__bar--bot {
	transform-origin: 12px 18.25px;
}

.bx-nav__toggle--open .bx-nav__bar--top {
	transform: translateY(6.25px) rotate(45deg) scaleX(0.88);
}

.bx-nav__toggle--open .bx-nav__bar--mid {
	transform: scaleX(0);
	opacity: 0;
}

.bx-nav__toggle--open .bx-nav__bar--bot {
	transform: translateY(-6.25px) rotate(-45deg) scaleX(0.88);
}

.bx-nav__scrim {
	position: fixed;
	inset: 56px 0 0;
	background: rgba(0, 0, 0, 0.55);
}

.bx-nav__menu {
	position: absolute;
	top: 100%;
	left: 0;
	right: 0;
	border-bottom: 1px solid var(--line);
	background: var(--surface-deep);
	box-shadow: var(--shadow-panel);
}

.bx-nav__menu[hidden] {
	display: none;
}

.bx-nav__menu-inner {
	display: flex;
	flex-direction: column;
	padding: var(--s-2) var(--s-4);
}

.bx-nav__menu-link {
	padding: var(--s-3) 0;
	font: 400 15px/1.4 var(--font-mono);
	color: var(--dim);
	text-decoration: none;
	transition: color 0.15s ease;
}

.bx-nav__menu-link:hover,
.bx-nav__menu-link--active {
	color: var(--fg);
}

.bx-nav__menu-link--active {
	font-weight: 500;
}

.bx-nav__menu-search {
	display: flex;
	align-items: center;
	gap: 10px;
	margin-top: var(--s-2);
	padding: var(--s-4) 0 var(--s-3);
	border: 0;
	border-top: 1px solid var(--line);
	background: none;
	font: 400 15px/1.4 var(--font-mono);
	color: var(--dim);
	text-align: left;
	cursor: pointer;
	transition: color 0.15s ease;
}

.bx-nav__menu-search:hover {
	color: var(--fg);
}

.bx-nav__menu-actions {
	display: flex;
	gap: 10px;
	margin-top: var(--s-2);
	padding: var(--s-4) 0 var(--s-2);
	border-top: 1px solid var(--line);
}

.bx-nav__menu-btn {
	display: inline-flex;
	flex: 1;
	align-items: center;
	justify-content: center;
	gap: var(--s-2);
	height: 44px;
	border: 1px solid var(--edge);
	border-radius: var(--r-1);
	font: 400 14px/1 var(--font-mono);
	color: var(--fg);
	text-decoration: none;
	transition:
		border-color 0.15s ease,
		background-color 0.15s ease;
}

.bx-nav__menu-btn:hover {
	border-color: var(--fg);
	background: var(--surface-2);
}

@media (min-width: 1024px) {
	.bx-nav__scrim,
	.bx-nav__menu {
		display: none;
	}
}

@media (max-width: 1023px) {
	.bx-nav__row {
		max-width: none;
		padding: 0 var(--s-4);
		gap: var(--s-3);
	}

	.bx-nav__links,
	.bx-nav__search {
		display: none;
	}

	.bx-nav__toggle {
		display: grid;
	}
}

@media (max-width: 640px) {
	.bx-nav--clear .bx-nav__name {
		opacity: 0;
	}
}
</style>
