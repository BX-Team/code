<script setup lang="ts">
import { type Component, computed, onMounted, ref } from 'vue';
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
    discordHref?: string;
    searchEnabled?: boolean;
    searchLabel?: string;
    /** Width of the bar's row — give it the page's own container so the wordmark
     *  lines up with the content under it. `none` spans the viewport. */
    maxWidth?: string;
    gutter?: string;
    /** `NuxtLink` keeps navigation client-side; a plain anchor reloads the page. */
    linkAs?: string | Component;
  }>(),
  {
    active: '',
    links: () => [
      { id: 'documentation', label: 'Documentation', href: '/docs' },
      { id: 'downloads', label: 'Downloads', href: '/downloads' },
      { id: 'tools', label: 'Tools', href: '/tools' },
      { id: 'team', label: 'Team', href: '/team' },
    ],
    brandHref: '/',
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
onMounted(() => {
  isMac.value = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/i.test(navigator.platform);
});
const kbdLabel = computed(() => (isMac.value ? '⌘K' : 'Ctrl K'));

const mobileOpen = ref(false);
</script>

<template>
	<header class="bx-nav" :style="{ '--bx-nav-max': maxWidth, '--bx-nav-pad': gutter }">
		<div class="bx-nav__row">
			<span v-if="$slots.lead" class="bx-nav__lead">
				<slot name="lead" />
			</span>

			<component :is="linkAs" :href="brandHref" class="bx-nav__brand">
				<BrandMark :size="22" />
				<span>BX Team</span>
				<span v-if="tag" class="bx-nav__tag">{{ tag }}</span>
			</component>

			<nav class="bx-nav__links">
				<component
					:is="linkAs"
					v-for="link in links"
					:key="link.id"
					:href="link.href"
					class="bx-nav__link"
					:class="{ 'bx-nav__link--active': active === link.id }"
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
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
						<circle cx="11" cy="11" r="7" />
						<line x1="21" y1="21" x2="16.65" y2="16.65" />
					</svg>
					<span class="bx-nav__search-text">{{ searchLabel }}</span>
					<span class="bx-nav__kbd">{{ kbdLabel }}</span>
				</button>

				<slot name="right" />

				<button
					class="bx-nav__ham"
					:class="{ 'bx-nav__ham--open': mobileOpen }"
					:aria-label="mobileOpen ? 'Close menu' : 'Open menu'"
					:aria-expanded="mobileOpen"
					@click="mobileOpen = !mobileOpen"
				>
					<span />
					<span />
					<span />
				</button>
			</div>
		</div>
	</header>

	<Transition name="bx-bd">
		<div v-if="mobileOpen" class="bx-drawer-backdrop" @click="mobileOpen = false" />
	</Transition>

	<Transition name="bx-drawer">
		<div v-if="mobileOpen" class="bx-drawer">
			<div class="bx-drawer__hd">
				<component :is="linkAs" :href="brandHref" class="bx-drawer__brand" @click="mobileOpen = false">
					<BrandMark :size="18" />
					<span>BX Team</span>
				</component>
				<button class="bx-drawer__close" aria-label="Close menu" @click="mobileOpen = false">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
						<line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
					</svg>
				</button>
			</div>

			<nav class="bx-drawer__nav">
				<button
					v-if="searchEnabled"
					type="button"
					class="bx-drawer__search"
					@click="mobileOpen = false; emit('search')"
				>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
						<circle cx="11" cy="11" r="7" />
						<line x1="21" y1="21" x2="16.65" y2="16.65" />
					</svg>
					<span>{{ searchLabel }}</span>
					<span class="bx-drawer__search-kbd">{{ kbdLabel }}</span>
				</button>
				<component
					:is="linkAs"
					v-for="link in links"
					:key="link.id"
					:href="link.href"
					class="bx-drawer__link"
					:class="{ 'bx-drawer__link--active': active === link.id }"
					@click="mobileOpen = false; emit('navigate', link.id)"
				>
					{{ link.label }}
				</component>
			</nav>

			<div class="bx-drawer__footer">
				<a :href="discordHref" class="bx-drawer__footer-cta" target="_blank" rel="noopener" @click="mobileOpen = false">
					Discord
				</a>
			</div>
		</div>
	</Transition>
</template>

<style scoped>
.bx-nav {
	position: sticky;
	top: 0;
	z-index: 40;
	flex: 0 0 auto;
	height: 56px;
	border-bottom: 1px solid var(--line);
	background: color-mix(in oklab, var(--bg-1) 82%, transparent);
	-webkit-backdrop-filter: blur(20px);
	backdrop-filter: blur(20px);
}

.bx-nav__row {
	display: flex;
	align-items: center;
	gap: 20px;
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
	font: 600 14.5px var(--font-sans);
	letter-spacing: -0.01em;
	color: var(--fg-hi);
	text-decoration: none;
}

.bx-nav__tag {
	font: 600 10px/1 var(--font-mono);
	letter-spacing: 0.12em;
	color: var(--mute);
	background: var(--bg-2);
	border: 1px solid var(--line);
	border-radius: var(--r-full);
	padding: 4px 7px;
}

.bx-nav__links {
	display: flex;
	gap: 2px;
	margin-left: -12px;
}

.bx-nav__link {
	padding: 6px 12px;
	border-radius: var(--r-full);
	font: 500 13.5px/1 var(--font-sans);
	color: var(--dim);
	text-decoration: none;
	transition: color 0.15s, background-color 0.15s;
}

.bx-nav__link:hover {
	color: var(--fg-hi);
	background: var(--hover);
}

.bx-nav__link--active {
	color: var(--fg-hi);
	background: var(--hover-2);
}

.bx-nav__right {
	display: flex;
	align-items: center;
	gap: 8px;
	margin-left: auto;
}

.bx-nav__search {
	display: inline-flex;
	align-items: center;
	gap: 10px;
	height: 32px;
	min-width: 230px;
	padding: 0 10px 0 12px;
	background: var(--bg-3);
	border: 1px solid var(--line);
	border-radius: var(--r-md);
	color: var(--mute);
	font: 400 13px/1 var(--font-sans);
	cursor: pointer;
	transition: border-color 0.15s, color 0.15s;
}

.bx-nav__search:hover {
	border-color: var(--line-2);
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
	font: 500 10.5px/1 var(--font-mono);
	color: var(--mute);
	border: 1px solid var(--line-2);
	border-radius: var(--r-xs);
	padding: 4px 6px;
}

.bx-nav__ham {
	display: none;
	flex-direction: column;
	justify-content: center;
	align-items: center;
	gap: 5px;
	width: 36px;
	height: 36px;
	padding: 6px;
	flex-shrink: 0;
	background: transparent;
	border: none;
	cursor: pointer;
}

.bx-nav__ham span {
	display: block;
	width: 18px;
	height: 1.5px;
	background: var(--dim);
	border-radius: 1px;
	transform-origin: center;
	transition: transform 0.2s ease, opacity 0.2s ease;
}

.bx-nav__ham--open span:nth-child(1) {
	transform: translateY(6.5px) rotate(45deg);
}

.bx-nav__ham--open span:nth-child(2) {
	opacity: 0;
	transform: scaleX(0);
}

.bx-nav__ham--open span:nth-child(3) {
	transform: translateY(-6.5px) rotate(-45deg);
}

.bx-drawer-backdrop {
	position: fixed;
	inset: 0;
	z-index: 150;
	background: rgba(0, 0, 0, 0.5);
	-webkit-backdrop-filter: blur(2px);
	backdrop-filter: blur(2px);
}

.bx-drawer {
	position: fixed;
	top: 0;
	right: 0;
	bottom: 0;
	z-index: 200;
	width: 280px;
	display: flex;
	flex-direction: column;
	overflow-y: auto;
	background: var(--bg-1);
	border-left: 1px solid var(--line);
}

.bx-drawer__hd {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 18px 20px;
	border-bottom: 1px solid var(--line);
}

.bx-drawer__brand {
	display: flex;
	align-items: center;
	gap: 8px;
	font: 700 14px var(--font-sans);
	letter-spacing: -0.01em;
	color: var(--fg-hi);
	text-decoration: none;
}

.bx-drawer__close {
	display: grid;
	place-items: center;
	width: 32px;
	height: 32px;
	background: var(--bg-2);
	border: 1px solid var(--line);
	border-radius: var(--r-md);
	color: var(--dim);
	cursor: pointer;
	transition: color 0.15s, border-color 0.15s;
}

.bx-drawer__close:hover {
	color: var(--fg-hi);
	border-color: var(--line-2);
}

.bx-drawer__nav {
	display: flex;
	flex-direction: column;
	flex: 1;
	gap: 2px;
	padding: 12px;
}

.bx-drawer__link {
	padding: 12px 14px;
	border-radius: var(--r-md);
	font: 500 14.5px var(--font-sans);
	color: var(--dim);
	text-decoration: none;
	transition: color 0.15s, background-color 0.15s;
}

.bx-drawer__link:hover,
.bx-drawer__link--active {
	color: var(--fg-hi);
	background: var(--hover);
}

.bx-drawer__search {
	display: flex;
	align-items: center;
	gap: 10px;
	width: 100%;
	padding: 12px 14px;
	margin-bottom: 6px;
	background: var(--bg-2);
	border: 1px solid var(--line);
	border-radius: var(--r-md);
	color: var(--dim);
	font: 500 14px var(--font-sans);
	cursor: pointer;
	transition: color 0.15s, border-color 0.15s;
}

.bx-drawer__search:hover {
	color: var(--fg-hi);
	border-color: var(--line-2);
}

.bx-drawer__search svg {
	color: var(--mute);
	flex-shrink: 0;
}

.bx-drawer__search-kbd {
	margin-left: auto;
	padding: 2px 6px;
	background: var(--bg-3);
	border: 1px solid var(--line);
	border-radius: var(--r-xs);
	font: 600 10.5px var(--font-mono);
	letter-spacing: 0.02em;
	color: var(--mute);
}

.bx-drawer__footer {
	display: flex;
	flex-direction: column;
	gap: 8px;
	padding: 16px;
	border-top: 1px solid var(--line);
}

.bx-drawer__footer-cta {
	padding: 12px 14px;
	border-radius: var(--r-md);
	font: 500 14px var(--font-sans);
	color: var(--bg-0);
	background: var(--fg-hi);
	text-align: center;
	text-decoration: none;
	transition: background-color 0.15s;
}

.bx-drawer__footer-cta:hover {
	background: var(--fg);
}

.bx-bd-enter-active,
.bx-bd-leave-active {
	transition: opacity 0.2s ease;
}

.bx-bd-enter-from,
.bx-bd-leave-to {
	opacity: 0;
}

.bx-drawer-enter-active,
.bx-drawer-leave-active {
	transition: transform 0.25s ease;
}

.bx-drawer-enter-from,
.bx-drawer-leave-to {
	transform: translateX(100%);
}

@media (max-width: 1023px) {
	.bx-nav__row {
		max-width: none;
		padding: 0 16px;
		gap: 12px;
	}

	.bx-nav__links {
		display: none;
	}

	.bx-nav__search {
		min-width: 0;
		padding: 0 9px;
	}

	.bx-nav__search-text,
	.bx-nav__kbd {
		display: none;
	}

	.bx-nav__ham {
		display: flex;
	}
}
</style>
