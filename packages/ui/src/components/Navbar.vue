<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
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
    loginHref?: string;
    dashboardHref?: string;
    discordHref?: string;
    loggedIn?: boolean;
    searchEnabled?: boolean;
  }>(),
  {
    active: '',
    links: () => [
      { id: 'downloads', label: 'Downloads', href: '/downloads' },
      { id: 'documentation', label: 'Documentation', href: '/docs' },
      { id: 'team', label: 'Team', href: '/team' },
    ],
    brandHref: '/',
    loginHref: '/login',
    dashboardHref: '/dashboard',
    discordHref: 'https://discord.gg/qNyybSSPm5',
    loggedIn: false,
    searchEnabled: false,
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
	<div class="bx-navwrap">
		<nav class="bx-bar">
			<a :href="brandHref" class="bx-bar__brand">
				<BrandMark :size="22" />
				<span>BX Team</span>
			</a>

			<div class="bx-bar__links">
				<a
					v-for="link in links"
					:key="link.id"
					:href="link.href"
					class="bx-bar__link"
					:class="{ 'bx-bar__link--active': active === link.id }"
					@click="emit('navigate', link.id)"
				>
					{{ link.label }}
				</a>
			</div>

			<button
				v-if="searchEnabled"
				type="button"
				class="bx-bar__search"
				aria-label="Open search"
				@click="emit('search')"
			>
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
					<circle cx="11" cy="11" r="7" />
					<line x1="21" y1="21" x2="16.65" y2="16.65" />
				</svg>
				<span class="bx-bar__search-kbd">{{ kbdLabel }}</span>
			</button>

			<div class="bx-bar__right-wrap">
				<slot name="right">
					<div class="bx-bar__right">
						<a :href="discordHref" class="bx-bar__ghost" target="_blank" rel="noopener">
							Discord
						</a>
						<a v-if="loggedIn" :href="dashboardHref" class="bx-bar__login">Dashboard</a>
						<a v-else :href="loginHref" class="bx-bar__login">Login</a>
					</div>
				</slot>
			</div>

			<button
				class="bx-bar__ham"
				:class="{ 'bx-bar__ham--open': mobileOpen }"
				:aria-label="mobileOpen ? 'Close menu' : 'Open menu'"
				:aria-expanded="mobileOpen"
				@click="mobileOpen = !mobileOpen"
			>
				<span />
				<span />
				<span />
			</button>
		</nav>
	</div>

	<Transition name="bx-bd">
		<div v-if="mobileOpen" class="bx-drawer-backdrop" @click="mobileOpen = false" />
	</Transition>

	<Transition name="bx-drawer">
		<div v-if="mobileOpen" class="bx-drawer">
			<div class="bx-drawer__hd">
				<a :href="brandHref" class="bx-drawer__brand" @click="mobileOpen = false">
					<BrandMark :size="18" />
					<span>BX Team</span>
				</a>
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
					<span>Search</span>
					<span class="bx-drawer__search-kbd">{{ kbdLabel }}</span>
				</button>
				<a
					v-for="link in links"
					:key="link.id"
					:href="link.href"
					class="bx-drawer__link"
					:class="{ 'bx-drawer__link--active': active === link.id }"
					@click="mobileOpen = false; emit('navigate', link.id)"
				>
					{{ link.label }}
				</a>
			</nav>

			<div class="bx-drawer__footer">
				<a :href="discordHref" class="bx-drawer__footer-ghost" target="_blank" rel="noopener" @click="mobileOpen = false">
					Discord
				</a>
				<a v-if="loggedIn" :href="dashboardHref" class="bx-drawer__footer-login" @click="mobileOpen = false">Dashboard</a>
				<a v-else :href="loginHref" class="bx-drawer__footer-login" @click="mobileOpen = false">Login</a>
			</div>
		</div>
	</Transition>

	<div class="bx-navwrap-spacer" aria-hidden="true" />
</template>

<style scoped>
.bx-navwrap {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	z-index: 100;
	display: flex;
	justify-content: center;
	padding-top: 16px;
	pointer-events: none;
}

.bx-navwrap-spacer {
	height: 52px;
}

.bx-bar {
	pointer-events: auto;
	display: flex;
	align-items: center;
	gap: 6px;
	padding: 7px 8px 7px 18px;
	background: color-mix(in oklab, var(--bg-1) 75%, transparent);
	-webkit-backdrop-filter: blur(20px);
	backdrop-filter: blur(20px);
	border: 1px solid var(--line);
	border-radius: var(--r-full);
	box-shadow: var(--shadow-card);
}

.bx-bar__brand {
	display: flex;
	align-items: center;
	gap: 8px;
	padding-right: 14px;
	margin-right: 6px;
	border-right: 1px solid var(--line);
	font: 700 14px var(--font-sans);
	color: var(--fg-hi);
	letter-spacing: -0.01em;
	text-decoration: none;
}

.bx-bar__links {
	display: flex;
	gap: 2px;
}

.bx-bar__link {
	padding: 7px 14px;
	color: var(--dim);
	font: 500 13.5px var(--font-sans);
	border-radius: var(--r-full);
	transition: color 0.15s, background 0.15s;
	text-decoration: none;
	cursor: pointer;
}

.bx-bar__link:hover,
.bx-bar__link--active {
	color: var(--fg-hi);
	background: rgba(255, 255, 255, 0.04);
}

.bx-bar__right {
	display: flex;
	align-items: center;
	gap: 4px;
}

.bx-bar__search {
	display: inline-flex;
	align-items: center;
	gap: 8px;
	height: 30px;
	padding: 0 8px 0 10px;
	margin-left: 6px;
	background: var(--bg-2);
	border: 1px solid var(--line);
	border-radius: var(--r-full);
	color: var(--mute);
	cursor: pointer;
	transition: color 0.15s, border-color 0.15s, background 0.15s;
}

.bx-bar__search:hover {
	color: var(--fg-hi);
	border-color: var(--line-2);
	background: var(--bg-3);
}

.bx-bar__search svg {
	flex-shrink: 0;
}

.bx-bar__search-kbd {
	display: inline-flex;
	align-items: center;
	height: 18px;
	padding: 0 6px;
	background: var(--bg-3);
	border: 1px solid var(--line);
	border-radius: var(--r-xs);
	font: 600 10.5px var(--font-mono);
	color: var(--mute);
	letter-spacing: 0.02em;
}

.bx-bar__right-wrap {
	display: flex;
	align-items: center;
	margin-left: 12px;
	padding-left: 14px;
	border-left: 1px solid var(--line);
}

.bx-bar__ghost {
	padding: 7px 12px;
	color: var(--dim);
	font: 500 13px var(--font-sans);
	border-radius: var(--r-full);
	text-decoration: none;
	transition: color 0.15s;
}

.bx-bar__ghost:hover {
	color: var(--fg-hi);
}

.bx-bar__login {
	padding: 7px 14px;
	font: 500 13px var(--font-sans);
	color: var(--bg-0);
	background: var(--fg-hi);
	border-radius: var(--r-full);
	text-decoration: none;
	transition: box-shadow 0.15s;
}

.bx-bar__login:hover {
	box-shadow: var(--shadow-glow);
}

/* Hamburger – hidden on desktop */
.bx-bar__ham {
	display: none;
	flex-direction: column;
	justify-content: center;
	align-items: center;
	gap: 5px;
	width: 36px;
	height: 36px;
	background: transparent;
	border: none;
	padding: 6px;
	cursor: pointer;
	flex-shrink: 0;
}

.bx-bar__ham span {
	display: block;
	width: 18px;
	height: 1.5px;
	background: var(--dim);
	border-radius: 1px;
	transition: transform 0.2s ease, opacity 0.2s ease;
	transform-origin: center;
}

.bx-bar__ham--open span:nth-child(1) {
	transform: translateY(6.5px) rotate(45deg);
}
.bx-bar__ham--open span:nth-child(2) {
	opacity: 0;
	transform: scaleX(0);
}
.bx-bar__ham--open span:nth-child(3) {
	transform: translateY(-6.5px) rotate(-45deg);
}

/* Backdrop */
.bx-drawer-backdrop {
	position: fixed;
	inset: 0;
	z-index: 150;
	background: rgba(0, 0, 0, 0.5);
	-webkit-backdrop-filter: blur(2px);
	backdrop-filter: blur(2px);
}

/* Side drawer */
.bx-drawer {
	position: fixed;
	top: 0;
	right: 0;
	bottom: 0;
	z-index: 200;
	width: 280px;
	background: var(--bg-1);
	border-left: 1px solid var(--line);
	display: flex;
	flex-direction: column;
	overflow-y: auto;
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
	color: var(--fg-hi);
	text-decoration: none;
	letter-spacing: -0.01em;
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
	padding: 12px;
	flex: 1;
	gap: 2px;
}

.bx-drawer__link {
	padding: 12px 14px;
	color: var(--dim);
	font: 500 14.5px var(--font-sans);
	border-radius: var(--r-md);
	text-decoration: none;
	transition: color 0.15s, background 0.15s;
}

.bx-drawer__link:hover,
.bx-drawer__link--active {
	color: var(--fg-hi);
	background: rgba(255, 255, 255, 0.04);
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
	color: var(--mute);
	letter-spacing: 0.02em;
}

.bx-drawer__footer {
	display: flex;
	flex-direction: column;
	gap: 8px;
	padding: 16px;
	border-top: 1px solid var(--line);
}

.bx-drawer__footer-ghost {
	padding: 12px 14px;
	color: var(--dim);
	font: 500 14px var(--font-sans);
	border: 1px solid var(--line);
	border-radius: var(--r-md);
	text-decoration: none;
	text-align: center;
	transition: color 0.15s, border-color 0.15s;
}
.bx-drawer__footer-ghost:hover {
	color: var(--fg-hi);
	border-color: var(--line-2);
}

.bx-drawer__footer-login {
	padding: 12px 14px;
	font: 500 14px var(--font-sans);
	color: var(--bg-0);
	background: var(--fg-hi);
	border-radius: var(--r-md);
	text-decoration: none;
	text-align: center;
	transition: box-shadow 0.15s;
}
.bx-drawer__footer-login:hover {
	box-shadow: var(--shadow-glow);
}

/* Drawer transitions */
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

@media (max-width: 768px) {
	.bx-bar {
		width: calc(100% - 32px);
		max-width: calc(100% - 32px);
	}

	.bx-bar__brand {
		border-right: none;
		padding-right: 0;
		margin-right: 0;
	}

	.bx-bar__links {
		display: none;
	}

	.bx-bar__right-wrap {
		display: none;
	}

	.bx-bar__search {
		display: none;
	}

	.bx-bar__ham {
		display: flex;
		margin-left: auto;
	}
}
</style>
