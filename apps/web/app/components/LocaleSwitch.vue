<script setup lang="ts">
import { Check, Languages } from '@lucide/vue';
import { onBeforeUnmount, onMounted, ref } from 'vue';

/** The site's language: a globe with a small menu in the bar, or a row of buttons in the phone menu. */
defineProps<{ row?: boolean }>();

const { locale, locales, setLocale, t } = useI18n();
const open = ref(false);
const root = ref<HTMLElement>();

async function choose(code: typeof locale.value) {
  open.value = false;
  if (code !== locale.value) await setLocale(code);
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
	<div v-if="row" class="ls-row" role="group" :aria-label="t('nav.language')">
		<button
			v-for="l in locales"
			:key="l.code"
			type="button"
			class="ls-row__btn"
			:class="{ 'ls-row__btn--on': l.code === locale }"
			:aria-pressed="l.code === locale"
			:lang="l.language"
			@click="choose(l.code)"
		>
			{{ l.name }}
		</button>
	</div>

	<div v-else ref="root" class="ls">
		<button
			type="button"
			class="ls__btn"
			:aria-expanded="open"
			aria-haspopup="menu"
			:aria-label="t('nav.language')"
			:title="t('nav.language')"
			@click="open = !open"
		>
			<Languages :size="17" :stroke-width="1.7" />
			<span class="ls__code">{{ locale }}</span>
		</button>

		<Transition name="ls-pop">
			<div v-if="open" class="ls__menu" role="menu">
				<button
					v-for="l in locales"
					:key="l.code"
					type="button"
					class="ls__item"
					role="menuitemradio"
					:aria-checked="l.code === locale"
					:lang="l.language"
					@click="choose(l.code)"
				>
					{{ l.name }}
					<Check v-if="l.code === locale" :size="15" :stroke-width="1.8" />
				</button>
			</div>
		</Transition>
	</div>
</template>

<style scoped>
.ls {
	position: relative;
}

.ls__btn {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	height: 36px;
	padding: 0 8px;
	border: 0;
	border-radius: var(--r-2);
	background: none;
	color: var(--mute);
	cursor: pointer;
}

.ls__btn:hover,
.ls__btn[aria-expanded='true'] {
	background: var(--surface-2);
	color: var(--fg-hi);
}

.ls__btn:focus-visible {
	outline: 2px solid var(--ring);
	outline-offset: -2px;
}

.ls__code {
	font: 600 12px/1 var(--font-mono);
	text-transform: uppercase;
	letter-spacing: 0.04em;
}

.ls__menu {
	position: absolute;
	top: calc(100% + 8px);
	right: 0;
	z-index: 50;
	display: flex;
	flex-direction: column;
	min-width: 168px;
	padding: 6px;
	border: 1px solid var(--line);
	border-radius: var(--r-3);
	background: var(--surface-card);
	box-shadow: var(--shadow-panel);
}

.ls__item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 10px;
	min-height: 40px;
	padding: 0 10px;
	border: 0;
	border-radius: var(--r-2);
	background: none;
	font: 500 14px/1 var(--font-sans);
	color: var(--dim);
	text-align: left;
	cursor: pointer;
}

.ls__item[aria-checked='true'] {
	color: var(--fg-hi);
}

.ls__item:hover,
.ls__item:focus-visible {
	background: var(--surface-2);
	color: var(--fg-hi);
	outline: none;
}

.ls-row {
	display: flex;
	gap: 10px;
	padding: var(--s-2) 0;
}

.ls-row__btn {
	flex: 1;
	height: 44px;
	border: 1px solid var(--line-2);
	border-radius: var(--r-2);
	background: none;
	font: 500 14px/1 var(--font-sans);
	color: var(--dim);
	cursor: pointer;
}

.ls-row__btn--on {
	border-color: var(--rule);
	background: var(--surface-2);
	color: var(--fg-hi);
}

.ls-pop-enter-active,
.ls-pop-leave-active {
	transition:
		opacity 0.14s ease,
		transform 0.14s ease;
}

.ls-pop-enter-from,
.ls-pop-leave-to {
	opacity: 0;
	transform: translateY(-4px);
}

@media (prefers-reduced-motion: reduce) {
	.ls-pop-enter-active,
	.ls-pop-leave-active {
		transition: none;
	}
}
</style>
