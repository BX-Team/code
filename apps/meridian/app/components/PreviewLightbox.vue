<script setup lang="ts">
import { ChevronLeft, ChevronRight, X } from '@lucide/vue';
import { useEventListener, useScrollLock } from '@vueuse/core';

interface Preview {
  src: string;
  alt: string;
  caption?: string;
}

const props = defineProps<{ previews: Preview[] }>();
const index = defineModel<number | null>({ required: true });

const current = computed(() => (index.value === null ? null : props.previews[index.value]));
const many = computed(() => props.previews.length > 1);
const closeRef = ref<HTMLButtonElement | null>(null);
const locked = useScrollLock(import.meta.client ? document.body : null);

function close() {
  index.value = null;
}

function step(by: number) {
  if (index.value === null) return;
  const n = props.previews.length;
  index.value = (index.value + by + n) % n;
}

watch(current, async (now, before) => {
  locked.value = !!now;
  if (now && !before) {
    await nextTick();
    closeRef.value?.focus();
  }
});

useEventListener(import.meta.client ? window : null, 'keydown', (e: KeyboardEvent) => {
  if (!current.value) return;
  if (e.key === 'Escape') close();
  else if (e.key === 'ArrowLeft' && many.value) step(-1);
  else if (e.key === 'ArrowRight' && many.value) step(1);
});
</script>

<template>
	<Teleport to="body">
		<Transition name="lightbox">
			<div v-if="current" class="lightbox" role="dialog" aria-modal="true" :aria-label="current.caption ?? current.alt" @click.self="close">
				<button ref="closeRef" class="lightbox__btn lightbox__close" type="button" aria-label="Close" @click="close">
					<X :size="20" :stroke-width="1.8" />
				</button>
				<button v-if="many" class="lightbox__btn lightbox__nav lightbox__nav--prev" type="button" aria-label="Previous" @click="step(-1)">
					<ChevronLeft :size="22" :stroke-width="1.8" />
				</button>
				<figure class="lightbox__figure" @click.self="close">
					<img :key="current.src" :src="current.src" :alt="current.alt" class="lightbox__img" />
					<figcaption class="lightbox__caption">
						<span v-if="current.caption">{{ current.caption }}</span>
						<span v-if="many" class="lightbox__count">{{ (index ?? 0) + 1 }} / {{ previews.length }}</span>
					</figcaption>
				</figure>
				<button v-if="many" class="lightbox__btn lightbox__nav lightbox__nav--next" type="button" aria-label="Next" @click="step(1)">
					<ChevronRight :size="22" :stroke-width="1.8" />
				</button>
			</div>
		</Transition>
	</Teleport>
</template>

<style scoped>
.lightbox {
	position: fixed;
	inset: 0;
	z-index: 300;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 56px 72px;
	background: rgba(0, 0, 0, 0.82);
}

.lightbox__figure {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--s-3);
	max-width: 100%;
	max-height: 100%;
	margin: 0;
}

.lightbox__img {
	display: block;
	max-width: 100%;
	max-height: calc(100vh - 160px);
	width: auto;
	height: auto;
	border: 1px solid var(--line-2);
	border-radius: var(--r-4);
	box-shadow: var(--shadow-pop);
}

.lightbox__caption {
	display: flex;
	gap: var(--s-3);
	color: rgba(255, 255, 255, 0.85);
	font-size: 14px;
}

.lightbox__count {
	color: rgba(255, 255, 255, 0.55);
	font-variant-numeric: tabular-nums;
}

.lightbox__btn {
	position: absolute;
	display: grid;
	place-items: center;
	width: 44px;
	height: 44px;
	border: 1px solid rgba(255, 255, 255, 0.14);
	border-radius: 999px;
	background: rgba(20, 20, 24, 0.7);
	color: #fff;
	cursor: pointer;
	transition: background 0.15s ease;
}

.lightbox__btn:hover,
.lightbox__btn:focus-visible {
	background: rgba(60, 60, 70, 0.9);
}

.lightbox__close {
	top: 12px;
	right: 12px;
}

.lightbox__nav {
	top: 50%;
	transform: translateY(-50%);
}

.lightbox__nav--prev {
	left: 14px;
}

.lightbox__nav--next {
	right: 14px;
}

.lightbox-enter-active,
.lightbox-leave-active {
	transition: opacity 0.18s ease;
}

.lightbox-enter-active .lightbox__img,
.lightbox-leave-active .lightbox__img {
	transition: transform 0.18s ease;
}

.lightbox-enter-from,
.lightbox-leave-to {
	opacity: 0;
}

.lightbox-enter-from .lightbox__img,
.lightbox-leave-to .lightbox__img {
	transform: scale(0.96);
}

@media (max-width: 860px) {
	.lightbox {
		padding: 64px 12px 72px;
	}

	.lightbox__nav {
		top: auto;
		bottom: 14px;
		transform: none;
	}

	.lightbox__nav--prev {
		left: calc(50% - 56px);
	}

	.lightbox__nav--next {
		right: calc(50% - 56px);
	}
}

@media (prefers-reduced-motion: reduce) {
	.lightbox-enter-active,
	.lightbox-leave-active,
	.lightbox-enter-active .lightbox__img,
	.lightbox-leave-active .lightbox__img {
		transition: none;
	}
}
</style>
