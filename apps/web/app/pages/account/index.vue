<script setup lang="ts">
import { ArrowRight } from '@lucide/vue';
import { computed } from 'vue';
import { describeAgent } from '~/lib/agents';
import { APPS, auth, PROVIDER_NAMES } from '~/lib/auth';

const { t } = useI18n();
const format = useFormat();
const sitePath = useSitePath();

useHead({ title: () => t('account.overview.title') });

const session = auth.useSession();
const { links, sessions, apps, appsFailed } = useAccountData();

const user = computed(() => session.value.data?.user);
const methods = computed(() =>
  links.value ? [t('account.overview.email'), ...links.value.flatMap(l => PROVIDER_NAMES[l.providerId] ?? [])] : null,
);
const lastDevice = computed(() => {
  const current = session.value.data?.session.id;
  const other = [...(sessions.value ?? [])]
    .filter(s => s.id !== current)
    .sort((a, b) => +b.updatedAt - +a.updatedAt)[0];
  return other
    ? `${describeAgent(other.userAgent, t).name}, ${format.relative(other.updatedAt.toISOString())}`
    : t('account.overview.onlyThis');
});
const since = computed(() => (user.value ? format.monthYear(user.value.createdAt) : ''));

const riven = computed(() => apps.value?.find(app => app.clientId === 'riven') ?? null);
const others = computed(() => (apps.value ?? []).filter(app => app.clientId !== 'riven' && APPS[app.clientId]));
</script>

<template>
	<h1 class="sr-only">{{ $t('account.overview.heading') }}</h1>

	<NuxtLink :to="sitePath('/account/security')" class="glance" :aria-label="$t('account.securityTab')">
		<div class="glance__cell">
			<span class="glance__label">{{ $t('account.overview.methods') }}</span>
			<span class="glance__value">{{ methods ? methods.join(', ') : '…' }}</span>
		</div>
		<div class="glance__cell">
			<span class="glance__label">{{ $t('account.overview.devices', { n: sessions?.length ?? '…' }) }}</span>
			<span class="glance__value">{{ sessions ? $t('account.overview.last', { device: lastDevice }) : '…' }}</span>
		</div>
		<div class="glance__cell">
			<span class="glance__label">{{ $t('account.overview.since') }}</span>
			<span class="glance__value">{{ since }}</span>
		</div>
		<span class="glance__go" aria-hidden="true"><ArrowRight :size="16" :stroke-width="1.8" /></span>
	</NuxtLink>

	<AccountRivenCard v-if="riven" :connected-at="riven.connectedAt" />

	<NuxtLink v-for="app in others" :key="app.clientId" :to="sitePath(APPS[app.clientId]?.page ?? '/account')" class="app">
		<span class="app__name">{{ APPS[app.clientId]?.name }}</span>
		<span class="app__sub">{{ $t(`account.apps.${app.clientId}`) }}</span>
	</NuxtLink>

	<section v-if="apps && !apps.length" class="none">
		<h2 class="none__title">{{ $t('account.overview.noneTitle') }}</h2>
		<p class="none__text">{{ $t('account.overview.noneText') }}</p>
	</section>
	<p v-else-if="appsFailed" class="hint bad" role="alert">{{ $t('account.overview.appsFailed') }}</p>
</template>

<style scoped>
.glance {
	display: flex;
	flex-wrap: wrap;
	align-items: stretch;
	overflow: hidden;
	border: 1px solid var(--line);
	border-radius: var(--r-3);
	background: var(--surface-card);
	text-decoration: none;
	transition:
		border-color 0.15s ease,
		background-color 0.15s ease;
}

.glance:hover {
	border-color: var(--line-2);
	background: var(--surface-2);
}

.glance__cell {
	display: flex;
	flex: 1 1 200px;
	flex-direction: column;
	gap: 4px;
	min-width: 0;
	padding: var(--s-4) var(--s-5);
	border-right: 1px solid var(--line);
}

.glance__label {
	font: 500 11px/1.4 var(--font-mono);
	text-transform: uppercase;
	letter-spacing: 0.1em;
	color: var(--mute);
}

.glance__value {
	font: 500 14px/1.4 var(--font-sans);
	color: var(--fg);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.glance__go {
	display: grid;
	flex: none;
	place-items: center;
	width: 52px;
	color: var(--mute);
}

.app {
	display: flex;
	flex-direction: column;
	gap: 4px;
	padding: var(--s-5);
	border: 1px solid var(--line);
	border-radius: var(--r-3);
	background: var(--surface-card);
	text-decoration: none;
}

.app__name {
	font: 600 16px/1.35 var(--font-sans);
	color: var(--fg-hi);
}

.app__sub {
	font: 400 13px/1.5 var(--font-sans);
	color: var(--mute);
}

.none {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--s-2);
	text-align: center;
	padding: var(--s-6);
	border: 1px dashed var(--line-2);
	border-radius: var(--r-3);
}

.none__title {
	margin: 0;
	font: 700 17px/1.3 var(--font-sans);
	color: var(--fg-hi);
}

.none__text {
	margin: 0;
	max-width: 62ch;
	font: 400 14px/1.6 var(--font-sans);
	color: var(--mute);
}

@media (max-width: 640px) {
	.glance__cell {
		flex-basis: 100%;
		border-right: 0;
		border-bottom: 1px solid var(--line);
	}

	.glance__go {
		display: none;
	}
}
</style>
