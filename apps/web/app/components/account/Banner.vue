<script setup lang="ts">
import { Check, Copy, LogOut } from '@lucide/vue';
import { computed, ref } from 'vue';
import { auth } from '~/lib/auth';

/** The top of every account page: the picture with its source menu, the names, and the way out. */
const session = auth.useSession();
const sitePath = useSitePath();
const path = useBarePath();

const user = computed(() => session.value.data?.user);
const username = computed(() => user.value?.displayUsername ?? user.value?.username ?? null);
const shown = computed(() => user.value?.name || username.value || user.value?.email || '');

/** Stored as 8 characters, shown as XXXX-XXXX. */
const code = computed(() => user.value?.friendCode?.replace(/^(.{4})/, '$1-') ?? '');
const copied = ref(false);

async function copyCode() {
  await navigator.clipboard.writeText(code.value);
  copied.value = true;
  setTimeout(() => (copied.value = false), 1500);
}

async function signOut() {
  await auth.signOut();
  navigateTo(sitePath('/'));
}
</script>

<template>
	<section v-if="user" class="bn">
		<HomeHeroBeams />
		<div class="bn__in">
			<AccountPictureMenu :size="64" />

			<div class="bn__who">
				<p class="bn__name">{{ shown }}</p>
				<p class="bn__sub">
					<template v-if="username">@{{ username }} · </template>BX ID
				</p>
			</div>

			<div class="bn__side">
				<button
					v-if="path === '/account/riven' && code"
					type="button"
					class="bn__chip"
					:aria-label="$t('account.banner.copyCode', { code })"
					@click="copyCode"
				>
					{{ $t('account.banner.friendCode') }} <span class="bn__code">{{ code }}</span>
					<component :is="copied ? Check : Copy" :size="14" :stroke-width="1.8" />
				</button>
				<button type="button" class="btn quiet small" @click="signOut">
					<LogOut :size="15" :stroke-width="1.8" />
					{{ $t('nav.signOut') }}
					</button>
			</div>
		</div>
	</section>
</template>

<style scoped>
.bn {
	position: relative;
	z-index: 3;
	background: var(--surface-deep);
	border-bottom: 1px solid var(--line);
}

.bn__in {
	position: relative;
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--s-4) var(--s-5);
	box-sizing: border-box;
	max-width: 1080px;
	margin: 0 auto;
	padding: var(--s-8) var(--s-4) var(--s-6);
}

.bn__who {
	display: flex;
	flex: 1 1 220px;
	flex-direction: column;
	gap: 4px;
	min-width: 0;
}

.bn__name {
	margin: 0;
	font: 800 clamp(22px, 2.6vw, 28px) / 1.1 var(--font-sans);
	letter-spacing: -0.04em;
	color: var(--fg-hi);
	overflow-wrap: anywhere;
}

.bn__sub {
	margin: 0;
	font: 400 14px/1.4 var(--font-sans);
	color: var(--mute);
}

.bn__side {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--s-2);
}

.bn__chip {
	display: inline-flex;
	align-items: center;
	gap: 8px;
	min-height: 36px;
	padding: 0 12px;
	border: 1px solid var(--line-2);
	border-radius: var(--r-2);
	background: color-mix(in srgb, var(--surface-deep) 70%, transparent);
	font: 500 13px/1 var(--font-sans);
	color: var(--dim);
	cursor: pointer;
}

.bn__chip:hover {
	color: var(--fg-hi);
	border-color: var(--rule);
}

.bn__code {
	font: 600 13px/1 var(--font-mono);
	letter-spacing: 0.05em;
	color: var(--fg-hi);
}

@media (max-width: 640px) {
	.bn__in {
		padding-top: var(--s-6);
	}

	.bn__in {
		column-gap: var(--s-4);
	}

	.bn__who {
		flex-basis: 0;
	}

	/* Sign out stays beside the name; the friend code chip drops to its own row. */
	.bn__side {
		display: contents;
	}

	.bn__chip {
		order: 1;
	}
}
</style>
