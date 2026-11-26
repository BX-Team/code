<script setup lang="ts">
import { KeyRound, LayoutGrid, ShieldCheck } from '@lucide/vue';

/** The frame of the BX ID forms: one narrow card under the site's bar; `pitch` adds what an account is for, product-neutral. */
defineProps<{ title: string; lead?: string; pitch?: boolean }>();

useHead({ meta: [{ name: 'robots', content: 'noindex' }] });

/** Each point is `account.pitch.<key>` with its line under `<key>Text`. */
const points = [
  { icon: KeyRound, key: 'noPassword' },
  { icon: LayoutGrid, key: 'oneSignIn' },
  { icon: ShieldCheck, key: 'control' },
];
</script>

<template>
	<PageShell>
		<main class="acct bxid" :class="{ 'acct--pitch': pitch }">
			<aside v-if="pitch" class="acct__pitch">
				<span class="acct__brand">BX ID</span>
				<i18n-t keypath="account.pitch.title" tag="h2" class="acct__pitch-title" scope="global">
					<template #brand><span class="bx-text-grad">BX Team</span></template>
				</i18n-t>
				<ul class="acct__points">
					<li v-for="point in points" :key="point.key">
						<span class="acct__icon"><component :is="point.icon" :size="18" :stroke-width="1.7" /></span>
						<div>
							<strong>{{ $t(`account.pitch.${point.key}`) }}</strong>
							<p>{{ $t(`account.pitch.${point.key}Text`) }}</p>
						</div>
					</li>
				</ul>
			</aside>

			<section class="acct__card">
				<header class="acct__head">
					<span v-if="!pitch" class="acct__brand">BX ID</span>
					<h1 class="acct__title">{{ title }}</h1>
					<p v-if="lead" class="acct__lead">{{ lead }}</p>
				</header>
				<slot />
			</section>
		</main>
	</PageShell>
</template>

<style scoped>
.acct {
	display: grid;
	justify-content: center;
	align-items: start;
	box-sizing: border-box;
	padding: var(--s-12) var(--s-4) 0;
}

.acct--pitch {
	grid-template-columns: minmax(0, 440px) minmax(0, 420px);
	gap: var(--s-16);
	align-items: center;
	min-height: calc(100svh - 52px - 200px);
}

.acct__pitch {
	display: flex;
	flex-direction: column;
	gap: var(--s-4);
}

.acct__pitch-title {
	margin: 0 0 var(--s-4);
	font: 900 clamp(30px, 3.6vw, 42px) / 1.08 var(--font-sans);
	letter-spacing: -0.045em;
	color: var(--fg-hi);
}

.acct__points {
	display: flex;
	flex-direction: column;
	gap: var(--s-5);
	margin: 0;
	padding: 0;
	list-style: none;
}

.acct__points li {
	display: flex;
	gap: var(--s-4);
}

.acct__icon {
	display: grid;
	flex: none;
	place-items: center;
	width: 36px;
	height: 36px;
	border: 1px solid var(--line);
	border-radius: var(--r-2);
	background: var(--surface-card);
	color: var(--fg);
}

.acct__points strong {
	font: 600 14.5px/1.4 var(--font-sans);
	color: var(--fg-hi);
}

.acct__points p {
	margin: 2px 0 0;
	font: 400 14px/1.55 var(--font-sans);
	color: var(--dim);
}

.acct__card {
	display: flex;
	flex-direction: column;
	gap: var(--s-6);
	box-sizing: border-box;
	width: 100%;
	max-width: 420px;
	padding: var(--s-8);
	border: 1px solid var(--line);
	border-radius: var(--r-4);
	background: var(--surface-card);
}

.acct:not(.acct--pitch) .acct__card {
	width: min(420px, 100vw - 2 * var(--s-4));
}

.acct__head {
	display: flex;
	flex-direction: column;
	gap: var(--s-2);
}

.acct__brand {
	font: 500 11px/1.4 var(--font-mono);
	text-transform: uppercase;
	letter-spacing: 0.08em;
	color: var(--mute);
}

.acct__title {
	margin: 0;
	font: 800 26px/1.15 var(--font-sans);
	letter-spacing: -0.035em;
	color: var(--fg-hi);
}

.acct__lead {
	margin: 0;
	font: 400 14px/1.6 var(--font-sans);
	color: var(--dim);
	overflow-wrap: anywhere;
}

@media (max-width: 920px) {
	.acct--pitch {
		grid-template-columns: minmax(0, 420px);
		gap: var(--s-8);
		min-height: 0;
	}

	.acct__pitch {
		order: 1;
	}

	.acct__pitch-title {
		font-size: 26px;
	}
}

@media (max-width: 480px) {
	.acct {
		padding-top: var(--s-6);
	}

	.acct__card {
		padding: var(--s-5);
	}
}
</style>
