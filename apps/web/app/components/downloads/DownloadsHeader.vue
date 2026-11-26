<script setup lang="ts">
/** The light top of every downloads page: crumbs, a title and its line, and the page's links on the right. */
defineProps<{ title: string; description?: string; crumb?: boolean }>();

const { t } = useI18n();
const sitePath = useSitePath();
</script>

<template>
	<header class="dh">
		<nav v-if="crumb" class="dh__crumbs" :aria-label="t('common.breadcrumb')">
			<NuxtLink :to="sitePath('/downloads')">{{ t('downloads.title') }}</NuxtLink>
			<span aria-hidden="true">/</span>
			<span aria-current="page">{{ title }}</span>
		</nav>
		<div class="dh__row">
			<div class="dh__text">
				<h1 class="dh__title">{{ title }}</h1>
				<p v-if="description" class="dh__desc">{{ description }}</p>
			</div>
			<div v-if="$slots.default" class="dh__links">
				<slot />
			</div>
		</div>
	</header>
</template>

<style scoped>
.dh {
	display: flex;
	flex-direction: column;
	gap: var(--s-4);
	max-width: var(--container);
	box-sizing: border-box;
	margin: 0 auto;
	padding: var(--s-10) var(--s-4) var(--s-6);
}

.dh__crumbs {
	display: flex;
	gap: var(--s-2);
	font: 400 13px/1.4 var(--font-sans);
	color: var(--mute);
}

.dh__crumbs a {
	color: var(--dim);
	transition: color 0.15s ease;
}

.dh__crumbs a:hover {
	color: var(--accent);
}

.dh__crumbs [aria-current] {
	color: var(--fg);
}

.dh__row {
	display: flex;
	flex-wrap: wrap;
	align-items: flex-end;
	justify-content: space-between;
	gap: var(--s-4) var(--s-8);
}

.dh__text {
	display: flex;
	flex-direction: column;
	gap: var(--s-2);
	max-width: 44rem;
}

.dh__title {
	margin: 0;
	font: 900 clamp(32px, 4.4vw, 48px) / 1.05 var(--font-sans);
	letter-spacing: -0.045em;
	color: var(--fg-hi);
}

.dh__desc {
	margin: 0;
	font: 400 15px/1.6 var(--font-sans);
	color: var(--dim);
}

.dh__links {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--s-2) var(--s-3);
}
</style>
