<script setup lang="ts">
import { Navbar, type NavLink, type NavStrings } from '@bx-team/ui';
import { computed, resolveComponent } from 'vue';
import discordSvgRaw from '~/assets/external/discord.svg?raw';
import githubSvgRaw from '~/assets/external/github.svg?raw';
import { DISCORD_URL, GITHUB_URL } from '~/config/links';

defineProps<{
  tag?: string;
  searchEnabled?: boolean;
  searchLabel?: string;
  maxWidth?: string;
  gutter?: string;
}>();

defineEmits<{ search: [] }>();

// Every section of the site is one Nuxt app, so the bar navigates without a reload.
const link = resolveComponent('NuxtLink');

const { t } = useI18n();
const path = useBarePath();
const sitePath = useSitePath();

const links = computed<NavLink[]>(() => [
  { id: 'documentation', label: t('nav.docs'), href: '/docs' },
  { id: 'downloads', label: t('nav.downloads'), href: sitePath('/downloads') },
  { id: 'tools', label: t('nav.tools'), href: sitePath('/tools') },
  { id: 'team', label: t('nav.team'), href: sitePath('/team') },
]);

const strings = computed<NavStrings>(() => ({
  home: t('nav.home'),
  main: t('nav.main'),
  menu: t('nav.menu'),
  closeMenu: t('nav.closeMenu'),
  search: t('nav.searchSite'),
}));

const active = computed(() => {
  if (path.value.startsWith('/docs')) return 'documentation';
  if (path.value.startsWith('/downloads')) return 'downloads';
  if (path.value.startsWith('/tools')) return 'tools';
  if (path.value.startsWith('/team')) return 'team';
  return '';
});
</script>

<template>
	<Navbar
		:active="active"
		:links="links"
		:brand-href="sitePath('/')"
		:strings="strings"
		:tag="tag"
		:link-as="link"
		:github-href="GITHUB_URL"
		:discord-href="DISCORD_URL"
		:search-enabled="searchEnabled"
		:search-label="searchLabel ?? t('nav.search')"
		:max-width="maxWidth"
		:gutter="gutter"
		@search="$emit('search')"
	>
		<template v-if="$slots.lead" #lead>
			<slot name="lead" />
		</template>

		<template #menu>
			<LocaleSwitch row />
		</template>

		<template #right>
			<LocaleSwitch class="locale" />
			<a class="icon-btn" :href="GITHUB_URL" target="_blank" rel="noopener" title="GitHub" aria-label="GitHub">
				<span class="raw-icon" v-html="githubSvgRaw" />
			</a>
			<a class="icon-btn" :href="DISCORD_URL" target="_blank" rel="noopener" title="Discord" aria-label="Discord">
				<span class="raw-icon" v-html="discordSvgRaw" />
			</a>
			<!-- The session lives in the browser, so the prerendered bar holds the corner until it is known. -->
			<ClientOnly>
				<NavAccount />
				<template #fallback><span class="account-slot" aria-hidden="true" /></template>
			</ClientOnly>
		</template>
	</Navbar>
</template>

<style scoped>
.icon-btn {
	display: grid;
	place-items: center;
	width: 36px;
	height: 36px;
	border-radius: var(--r-2);
	color: var(--mute);
}

.icon-btn:hover {
	background: var(--surface-2);
	color: var(--fg-hi);
}

.account-slot {
	width: 28px;
	height: 28px;
	margin: 0 4px 0 8px;
	border-radius: var(--r-pill);
	background: var(--surface-2);
}

.raw-icon {
	display: inline-flex;
	align-items: center;
	line-height: 0;
}

.raw-icon :deep(svg) {
	width: 18px;
	height: 18px;
}

@media (max-width: 1023px) {
	.icon-btn,
	.locale {
		display: none;
	}
}
</style>
