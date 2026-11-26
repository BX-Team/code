<script setup lang="ts">
import { computed, ref, watch } from 'vue';

/** A skin seen from the front, cut straight out of its 64×64 (or pre-1.8 64×32) texture. */
const props = withDefaults(defineProps<{ url: string; slim?: boolean; scale?: number }>(), { slim: false, scale: 6 });

const legacy = ref(false);
watch(
  () => props.url,
  url => {
    const image = new Image();
    image.onload = () => {
      legacy.value = image.naturalHeight === 32;
    };
    image.src = url;
  },
  { immediate: true },
);

interface Part {
  key: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Pre-1.8 textures have no left limbs; the game mirrors the right ones. */
  flip?: boolean;
  over?: { x: number; y: number };
}

const rows = computed<Part[][]>(() => {
  const a = props.slim ? 3 : 4;
  const old = legacy.value;
  const rightArm: Part = { key: 'ra', x: 44, y: 20, w: a, h: 12, over: old ? undefined : { x: 44, y: 36 } };
  const leftArm: Part = old
    ? { ...rightArm, key: 'la', flip: true }
    : { key: 'la', x: 36, y: 52, w: a, h: 12, over: { x: 52, y: 52 } };
  const rightLeg: Part = { key: 'rl', x: 4, y: 20, w: 4, h: 12, over: old ? undefined : { x: 4, y: 36 } };
  const leftLeg: Part = old
    ? { ...rightLeg, key: 'll', flip: true }
    : { key: 'll', x: 20, y: 52, w: 4, h: 12, over: { x: 4, y: 52 } };
  return [
    [{ key: 'head', x: 8, y: 8, w: 8, h: 8, over: { x: 40, y: 8 } }],
    [rightArm, { key: 'body', x: 20, y: 20, w: 8, h: 12, over: old ? undefined : { x: 20, y: 36 } }, leftArm],
    [rightLeg, leftLeg],
  ];
});

function face(part: Part, at = { x: part.x, y: part.y }) {
  const s = props.scale;
  return {
    width: `${part.w * s}px`,
    height: `${part.h * s}px`,
    backgroundImage: `url(${props.url})`,
    backgroundSize: `${64 * s}px auto`,
    backgroundPosition: `${-at.x * s}px ${-at.y * s}px`,
  };
}
</script>

<template>
	<div class="sf" role="img" :aria-label="$t('account.riven.front')">
		<div v-for="(row, i) in rows" :key="i" class="sf__row">
			<span v-for="part in row" :key="part.key" class="sf__part" :class="{ flip: part.flip }" :style="face(part)">
				<span v-if="part.over" class="sf__part sf__over" :style="face(part, part.over)" />
			</span>
		</div>
	</div>
</template>

<style scoped>
.sf {
	display: flex;
	flex-direction: column;
	align-items: center;
	filter: drop-shadow(0 12px 16px rgb(0 0 0 / 0.4));
}

.sf__row {
	display: flex;
}

.sf__part {
	position: relative;
	display: block;
	background-repeat: no-repeat;
	image-rendering: pixelated;
}

.sf__part.flip {
	transform: scaleX(-1);
}

.sf__over {
	position: absolute;
	inset: 0;
}
</style>
