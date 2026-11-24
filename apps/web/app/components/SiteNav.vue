<script setup lang="ts">
import { Navbar, type NavLink } from '@bx-team/ui';
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

const route = useRoute();
const links: NavLink[] = [
  { id: 'documentation', label: 'Docs', href: '/docs' },
  { id: 'downloads', label: 'Downloads', href: '/downloads' },
  { id: 'tools', label: 'Tools', href: '/tools' },
  { id: 'team', label: 'Team', href: '/team' },
];

const active = computed(() => {
  if (route.path.startsWith('/docs')) return 'documentation';
  if (route.path.startsWith('/downloads')) return 'downloads';
  if (route.path.startsWith('/tools')) return 'tools';
  if (route.path.startsWith('/team')) return 'team';
  return '';
});
</script>

<template>
	<Navbar
		:active="active"
		:links="links"
		:tag="tag"
		:link-as="link"
		:github-href="GITHUB_URL"
		:discord-href="DISCORD_URL"
		:search-enabled="searchEnabled"
		:search-label="searchLabel"
		:max-width="maxWidth"
		:gutter="gutter"
		@search="$emit('search')"
	>
		<template v-if="$slots.lead" #lead>
			<slot name="lead" />
		</template>

		<template #right>
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
	.icon-btn {
		display: none;
	}
}
</style>
