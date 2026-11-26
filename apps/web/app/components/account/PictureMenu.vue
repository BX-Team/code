<script setup lang="ts">
import type { PictureSource } from '@bx-team/types/schema/bxid';
import { Check, Pencil } from '@lucide/vue';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { auth, PROVIDER_NAMES, pictureSource, setPicture } from '~/lib/auth';

const props = withDefaults(defineProps<{ size?: number }>(), { size: 56 });

const { t } = useI18n();
const session = auth.useSession();
const { links } = useAccountData();
const user = computed(() => session.value.data?.user);
const shown = computed(() => user.value?.name || user.value?.displayUsername || user.value?.email || '');
const current = computed(() => pictureSource(user.value?.image));

const open = ref(false);
const busy = ref<PictureSource | null>(null);
const notify = useNotify();
const root = ref<HTMLElement>();

const options = computed(() => {
  const linked = new Set((links.value ?? []).map(l => l.providerId));
  return [
    ...(['discord', 'github'] as const).map(id => ({ id, label: PROVIDER_NAMES[id] ?? id, ok: linked.has(id) })),
    { id: 'initial' as const, label: t('account.picture.initial'), ok: true },
  ];
});

async function pick(source: PictureSource) {
  busy.value = source;
  try {
    await setPicture(source);
    open.value = false;
  } catch (e) {
    notify.error(e);
  } finally {
    busy.value = null;
  }
}

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
</script>

<template>
	<div v-if="user" ref="root" class="pm">
		<AccountAvatar :id="user.id" :name="shown" :image="user.image" :size="props.size" class="pm__avatar" />
		<button
			type="button"
			class="pm__pen"
			:aria-label="$t('account.picture.change')"
			aria-haspopup="menu"
			:aria-expanded="open"
			@click="open = !open"
		>
			<Pencil :size="13" :stroke-width="2" />
		</button>

		<div v-if="open" class="pm__menu" role="menu" :aria-label="$t('account.picture.from')">
			<span class="pm__title">{{ $t('account.picture.from') }}</span>
			<button
				v-for="option in options"
				:key="option.id"
				type="button"
				role="menuitemradio"
				class="pm__item"
				:aria-checked="current === option.id"
				:disabled="!option.ok || busy !== null"
				@click="pick(option.id)"
			>
				<span class="pm__label">{{ option.label }}</span>
				<span v-if="!option.ok" class="pm__note">{{ $t('account.methods.notConnected') }}</span>
				<span v-else-if="busy === option.id" class="pm__note">{{ $t('account.picture.saving') }}</span>
				<Check v-else-if="current === option.id" :size="15" :stroke-width="2" class="pm__check" />
			</button>
		</div>
	</div>
</template>

<style scoped>
.pm {
	position: relative;
	flex: none;
	line-height: 0;
}

.pm__avatar {
	box-shadow: 0 0 0 3px var(--surface-deep);
}

.pm__pen {
	position: absolute;
	right: -6px;
	bottom: -6px;
	display: grid;
	place-items: center;
	width: 28px;
	height: 28px;
	padding: 0;
	border: 2px solid var(--surface-deep);
	border-radius: var(--r-pill);
	background: var(--fg);
	color: var(--surface-deep);
	cursor: pointer;
	transition: background-color 0.15s ease;
}

.pm__pen::after {
	position: absolute;
	inset: -8px;
	content: '';
}

.pm__pen:hover {
	background: var(--fg-hi);
}

.pm__pen:focus-visible {
	outline: 2px solid var(--ring);
	outline-offset: 2px;
}

.pm__menu {
	position: absolute;
	top: calc(100% + 12px);
	left: 0;
	z-index: 20;
	display: flex;
	flex-direction: column;
	min-width: 220px;
	padding: 6px;
	border: 1px solid var(--line);
	border-radius: var(--r-3);
	background: var(--surface-card);
	box-shadow: var(--shadow-panel);
	line-height: normal;
}

.pm__title {
	padding: 6px 10px 8px;
	font: 500 11px/1.4 var(--font-mono);
	text-transform: uppercase;
	letter-spacing: 0.1em;
	color: var(--mute);
}

.pm__item {
	display: flex;
	align-items: center;
	gap: var(--s-2);
	min-height: 40px;
	padding: 0 10px;
	border: 0;
	border-radius: var(--r-2);
	background: none;
	font: 500 14px/1 var(--font-sans);
	color: var(--fg);
	text-align: left;
	cursor: pointer;
}

.pm__item:hover:not(:disabled),
.pm__item:focus-visible {
	background: var(--surface-2);
	outline: none;
}

.pm__item:disabled {
	cursor: default;
	color: var(--mute);
}

.pm__label {
	flex: 1;
}

.pm__note {
	font: 400 12px/1 var(--font-sans);
	color: var(--mute);
}

.pm__check {
	color: var(--accent);
}
</style>
