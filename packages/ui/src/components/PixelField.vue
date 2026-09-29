<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { mountPixelField, type PixelFieldHandle } from '../pixel/field';

const props = defineProps<{
  variant?: 'hero' | 'field';
  slotEl?: HTMLElement | null;
  markEl?: HTMLElement | null;
}>();

const emit = defineEmits<{ painted: [] }>();

const canvas = ref<HTMLCanvasElement | null>(null);
let field: PixelFieldHandle | undefined;

onMounted(() => {
  if (!canvas.value) return;
  field = mountPixelField(canvas.value, {
    variant: props.variant ?? 'field',
    slot: props.slotEl,
    markSlot: props.markEl,
    onPainted: () => emit('painted'),
  });
});

watch(
  () => props.slotEl,
  el => field?.setSlot(el ?? null),
);
watch(
  () => props.markEl,
  el => field?.setMarkSlot(el ?? null),
);

onBeforeUnmount(() => field?.destroy());
</script>

<template>
	<div class="bx-pixelfield" aria-hidden="true">
		<canvas ref="canvas" class="bx-pixelfield__canvas" />
	</div>
</template>

<style scoped>
.bx-pixelfield {
	position: absolute;
	inset: 0;
	pointer-events: none;
	user-select: none;
	background: var(--pixel-bg);
}

.bx-pixelfield__canvas {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
	display: block;
	animation: bx-pixelfield-in 900ms ease-out both;
}

@keyframes bx-pixelfield-in {
	from {
		opacity: 0;
	}
}

@media (prefers-reduced-motion: reduce) {
	.bx-pixelfield__canvas {
		animation: none;
	}
}
</style>
