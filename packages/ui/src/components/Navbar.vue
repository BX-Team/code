<script setup lang="ts">
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
  }>(),
  {
    active: '',
    links: () => [
      { id: 'downloads', label: 'Downloads', href: '/downloads' },
      { id: 'documentation', label: 'Documentation', href: '/docs' },
      { id: 'team', label: 'Team', href: '/team' },
      { id: 'status', label: 'Status', href: '/status' },
    ],
    brandHref: '/',
    loginHref: '/login',
    dashboardHref: '/dashboard',
    discordHref: 'https://discord.gg/qNyybSSPm5',
    loggedIn: false,
  },
);

const emit = defineEmits<{
  navigate: [id: string];
}>();
</script>

<template>
	<div class="bx-navwrap">
		<nav class="bx-bar">
			<a :href="brandHref" class="bx-bar__brand">
				<BrandMark :size="20" />
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

			<slot name="right">
				<div class="bx-bar__right">
					<a :href="discordHref" class="bx-bar__ghost" target="_blank" rel="noopener">
						Discord
					</a>
					<a v-if="loggedIn" :href="dashboardHref" class="bx-bar__login">Dashboard</a>
					<a v-else :href="loginHref" class="bx-bar__login">Login</a>
				</div>
			</slot>
		</nav>
	</div>
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
</style>
