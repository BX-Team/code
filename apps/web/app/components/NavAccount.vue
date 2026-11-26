<script setup lang="ts">
import { LogOut, UserRound } from '@lucide/vue';
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { auth } from '~/lib/auth';

/** The bar's account corner: "Sign in", or the avatar with a small menu once signed in. */
const session = auth.useSession();
const route = useRoute();
const path = useBarePath();
const sitePath = useSitePath();
const { t } = useI18n();
const open = ref(false);
const root = ref<HTMLElement>();

function onPointer(event: PointerEvent) {
  if (open.value && root.value && !root.value.contains(event.target as Node)) open.value = false;
}

function onKey(event: KeyboardEvent) {
  if (event.key === 'Escape') open.value = false;
}

onMounted(() => {
  document.addEventListener('pointerdown', onPointer);
  document.addEventListener('keydown', onKey);
});

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onPointer);
  document.removeEventListener('keydown', onKey);
});

watch(
  () => route.fullPath,
  () => {
    open.value = false;
  },
);

async function signOut() {
  open.value = false;
  await auth.signOut();
  if (path.value.startsWith('/account')) navigateTo(sitePath('/'));
}
</script>

<template>
	<div ref="root" class="na">
		<span v-if="session.isPending" class="na__wait" aria-hidden="true" />

		<NuxtLink v-else-if="!session.data" :to="sitePath('/login')" class="na__signin">{{ t('nav.signIn') }}</NuxtLink>

		<template v-else>
			<button
				type="button"
				class="na__me"
				:aria-expanded="open"
				aria-haspopup="menu"
				:aria-label="t('nav.yourBxid')"
				@click="open = !open"
			>
				<AccountAvatar
					:id="session.data.user.id"
					:name="session.data.user.displayUsername || session.data.user.name || session.data.user.email"
					:image="session.data.user.image"
					:size="28"
				/>
			</button>

			<Transition name="na-pop">
				<div v-if="open" class="na__menu" role="menu">
					<div class="na__who">
						<strong>{{ session.data.user.displayUsername || session.data.user.name }}</strong>
						<span>{{ session.data.user.email }}</span>
					</div>
					<NuxtLink :to="sitePath('/account')" class="na__item" role="menuitem">
						<UserRound :size="16" :stroke-width="1.7" />
						{{ t('nav.account') }}
					</NuxtLink>
					<button type="button" class="na__item" role="menuitem" @click="signOut">
						<LogOut :size="16" :stroke-width="1.7" />
						{{ t('nav.signOut') }}
					</button>
				</div>
			</Transition>
		</template>
	</div>
</template>

<style scoped>
.na {
	position: relative;
	display: flex;
	align-items: center;
	margin-left: var(--s-1);
}

.na__wait {
	width: 28px;
	height: 28px;
	margin: 0 4px;
	border-radius: var(--r-pill);
	background: var(--surface-2);
}

.na__signin {
	display: inline-flex;
	align-items: center;
	min-height: 32px;
	padding: 0 12px;
	border: 1px solid var(--line-2);
	border-radius: var(--r-2);
	font: 500 13.5px/1 var(--font-sans);
	color: var(--fg);
	text-decoration: none;
	transition:
		background-color 0.15s ease,
		border-color 0.15s ease;
}

.na__signin:hover {
	background: var(--surface-2);
	border-color: var(--rule);
}

.na__me {
	display: grid;
	place-items: center;
	width: 40px;
	height: 40px;
	padding: 0;
	border: 0;
	border-radius: var(--r-pill);
	background: transparent;
	cursor: pointer;
}

.na__me:focus-visible {
	outline: 2px solid var(--ring);
	outline-offset: -2px;
}

.na__menu {
	position: absolute;
	top: calc(100% + 8px);
	right: 0;
	z-index: 50;
	display: flex;
	flex-direction: column;
	min-width: 220px;
	padding: 6px;
	border: 1px solid var(--line);
	border-radius: var(--r-3);
	background: var(--surface-card);
	box-shadow: var(--shadow-panel);
}

.na__who {
	display: flex;
	flex-direction: column;
	gap: 2px;
	padding: 8px 10px 10px;
	margin-bottom: 4px;
	border-bottom: 1px solid var(--line);
	min-width: 0;
}

.na__who strong {
	font: 600 14px/1.3 var(--font-sans);
	color: var(--fg-hi);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.na__who span {
	font: 400 12.5px/1.3 var(--font-sans);
	color: var(--mute);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.na__item {
	display: flex;
	align-items: center;
	gap: 10px;
	min-height: 40px;
	padding: 0 10px;
	border: 0;
	border-radius: var(--r-2);
	background: none;
	font: 500 14px/1 var(--font-sans);
	color: var(--dim);
	text-align: left;
	text-decoration: none;
	cursor: pointer;
}

.na__item:hover,
.na__item:focus-visible {
	background: var(--surface-2);
	color: var(--fg-hi);
	outline: none;
}

.na-pop-enter-active,
.na-pop-leave-active {
	transition:
		opacity 0.14s ease,
		transform 0.14s ease;
}

.na-pop-enter-from,
.na-pop-leave-to {
	opacity: 0;
	transform: translateY(-4px);
}

@media (prefers-reduced-motion: reduce) {
	.na-pop-enter-active,
	.na-pop-leave-active {
		transition: none;
	}
}
</style>
