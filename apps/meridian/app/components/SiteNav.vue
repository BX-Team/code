<script setup lang="ts">
import { Navbar } from '@bx-team/ui';
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
const active = computed(() => {
  if (route.path.startsWith('/docs')) return 'documentation';
  if (route.path.startsWith('/downloads')) return 'downloads';
  if (route.path.startsWith('/team')) return 'team';
  return '';
});
</script>

<template>
	<Navbar
		:active="active"
		:tag="tag"
		:link-as="link"
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
		</template>
	</Navbar>
</template>

<style scoped>
.icon-btn {
	display: grid;
	place-items: center;
	width: 32px;
	height: 32px;
	border-radius: var(--r-md);
	color: var(--dim);
}

.icon-btn:hover {
	background: var(--hover);
	color: var(--fg-hi);
}

.raw-icon {
	display: inline-flex;
	align-items: center;
	line-height: 0;
}

.raw-icon :deep(svg) {
	width: 16px;
	height: 16px;
}

@media (max-width: 1023px) {
	.icon-btn {
		display: none;
	}
}
</style>
