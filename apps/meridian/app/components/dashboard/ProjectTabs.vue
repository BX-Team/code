<script setup lang="ts">
const props = defineProps<{
  slug: string;
  projectType: 'server' | 'plugin' | 'mod';
}>();

const route = useRoute();

const tabs = computed(() => {
  const base = [
    { label: 'Overview', href: `/dashboard/${props.slug}` },
    { label: 'Errors', href: `/dashboard/${props.slug}/errors` },
    { label: 'Settings', href: `/dashboard/${props.slug}/settings` },
  ];
  if (props.projectType === 'server') {
    base.splice(1, 0, { label: 'Players', href: `/dashboard/${props.slug}/players` });
  } else {
    base.splice(2, 0, { label: 'Metrics', href: `/dashboard/${props.slug}/metrics` });
  }
  return base;
});

function isActive(href: string) {
  if (href === `/dashboard/${props.slug}`) return route.path === href;
  return route.path === href;
}
</script>

<template>
	<div class="tabs-bar px-4 lg:px-6">
		<nav class="tabs">
			<button
				v-for="tab in tabs"
				:key="tab.href"
				class="tab"
				:class="{ active: isActive(tab.href) }"
				@click="navigateTo(tab.href)"
			>
				{{ tab.label }}
			</button>
		</nav>
	</div>
</template>

<style scoped>
.tabs-bar {
	border-bottom: 1px solid var(--line);
}
.tabs {
	display: flex;
	gap: 0;
}
.tab {
	padding: 12px 16px;
	font: 500 13.5px var(--font-sans);
	color: var(--dim);
	cursor: pointer;
	border: none;
	background: transparent;
	border-bottom: 2px solid transparent;
	margin-bottom: -1px;
	transition: color .15s, border-color .15s;
}
.tab:hover { color: var(--fg-hi); }
.tab.active { color: var(--fg-hi); border-bottom-color: var(--brand); }
</style>
