<script setup lang="ts">
import { ArrowRight } from '@lucide/vue';
import { computed } from 'vue';
import { describeAgent } from '~/lib/agents';
import { APPS, auth, PROVIDER_NAMES } from '~/lib/auth';
import { relativeTime } from '~/utils/datetime';

useHead({ title: 'Account' });

const session = auth.useSession();
const { links, sessions, apps, appsFailed } = useAccountData();

const user = computed(() => session.value.data?.user);
const methods = computed(() =>
  links.value ? ['Email', ...links.value.flatMap(l => PROVIDER_NAMES[l.providerId] ?? [])] : null,
);
const lastDevice = computed(() => {
  const current = session.value.data?.session.id;
  const other = [...(sessions.value ?? [])]
    .filter(s => s.id !== current)
    .sort((a, b) => +b.updatedAt - +a.updatedAt)[0];
  return other
    ? `${describeAgent(other.userAgent).name}, ${relativeTime(other.updatedAt.toISOString())}`
    : 'Only this one';
});
const since = computed(() =>
  user.value ? new Date(user.value.createdAt).toLocaleDateString('en', { month: 'long', year: 'numeric' }) : '',
);

const riven = computed(() => apps.value?.find(app => app.clientId === 'riven') ?? null);
const others = computed(() => (apps.value ?? []).filter(app => app.clientId !== 'riven' && APPS[app.clientId]));
</script>

<template>
	<h1 class="sr-only">Account overview</h1>

	<NuxtLink to="/account/security" class="glance" aria-label="Account and security">
		<div class="glance__cell">
			<span class="glance__label">Sign-in methods</span>
			<span class="glance__value">{{ methods ? methods.join(', ') : '…' }}</span>
		</div>
		<div class="glance__cell">
			<span class="glance__label">Devices · {{ sessions?.length ?? '…' }}</span>
			<span class="glance__value">{{ sessions ? `Last: ${lastDevice}` : '…' }}</span>
		</div>
		<div class="glance__cell">
			<span class="glance__label">Member since</span>
			<span class="glance__value">{{ since }}</span>
		</div>
		<span class="glance__go" aria-hidden="true"><ArrowRight :size="16" :stroke-width="1.8" /></span>
	</NuxtLink>

	<AccountRivenCard v-if="riven" :connected-at="riven.connectedAt" />

	<NuxtLink v-for="app in others" :key="app.clientId" :to="APPS[app.clientId]?.page ?? '/account'" class="app">
		<span class="app__name">{{ APPS[app.clientId]?.name }}</span>
		<span class="app__sub">{{ APPS[app.clientId]?.about }}</span>
	</NuxtLink>

	<section v-if="apps && !apps.length" class="none">
		<h2 class="none__title">Not connected to any app yet</h2>
		<p class="none__text">
			Sign in to a BX Team app with this BX ID and it gets its own tab here, with what it keeps for you. Riven Launcher,
			for one, adds a skin and friends.
		</p>
		<NuxtLink to="/riven" class="btn small none__go">About Riven Launcher</NuxtLink>
	</section>
	<p v-else-if="appsFailed" class="hint bad" role="alert">Your apps could not be loaded. Reload the page to try again.</p>
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
	gap: var(--s-2);
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

.none__go {
	align-self: flex-start;
	margin-top: var(--s-2);
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
