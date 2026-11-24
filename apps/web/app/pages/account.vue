<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { APPS } from '~/lib/auth';

useHead({ meta: [{ name: 'robots', content: 'noindex' }] });

const session = useBxidSession();
const user = computed(() => session.value.data?.user);
const { apps, refresh } = useAccountData();

onMounted(refresh);

/** One tab per app this BX ID has signed in to, after the account's own two. */
const tabs = computed(() => [
  { to: '/account', label: 'Overview' },
  { to: '/account/security', label: 'Account & security' },
  ...(apps.value ?? []).flatMap(app => {
    const known = APPS[app.clientId];
    return known ? [{ to: known.page, label: known.name }] : [];
  }),
]);
</script>

<template>
	<PageShell>
		<div class="acc bxid">
			<template v-if="user">
				<AccountBanner />
				<nav class="acc__tabs" aria-label="Account">
					<div class="acc__tabs-in">
						<NuxtLink v-for="tab in tabs" :key="tab.to" :to="tab.to" class="acc__tab" exact-active-class="on">
							{{ tab.label }}
						</NuxtLink>
					</div>
				</nav>
				<main class="acc__main">
					<NuxtPage />
				</main>
			</template>
			<div v-else class="acc__wait" aria-busy="true" />
		</div>
	</PageShell>
</template>

<style scoped>
.acc {
	display: flex;
	flex-direction: column;
	width: 100%;
}

.acc__tabs {
	position: sticky;
	top: 52px;
	z-index: 2;
	background: var(--surface-0);
	border-bottom: 1px solid var(--line);
}

.acc__tabs-in {
	display: flex;
	gap: var(--s-6);
	box-sizing: border-box;
	max-width: 1080px;
	margin: 0 auto;
	padding: 0 var(--s-4);
	overflow-x: auto;
	scrollbar-width: none;
}

.acc__tab {
	display: inline-flex;
	flex: none;
	align-items: center;
	min-height: 50px;
	margin-bottom: -1px;
	border-bottom: 2px solid transparent;
	font: 500 14.5px/1 var(--font-sans);
	color: var(--mute);
	text-decoration: none;
	transition:
		color 0.15s ease,
		border-color 0.15s ease;
}

.acc__tab:hover {
	color: var(--fg);
}

.acc__tab.on {
	border-bottom-color: var(--accent);
	color: var(--fg-hi);
}

.acc__main {
	display: flex;
	flex-direction: column;
	gap: var(--s-5);
	box-sizing: border-box;
	width: 100%;
	max-width: 1080px;
	margin: 0 auto;
	padding: var(--s-6) var(--s-4) 0;
}

.acc__wait {
	min-height: 60vh;
}
</style>
