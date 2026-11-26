<script setup lang="ts">
// Soft gradients scaled by CSS transforms: nothing thin to blur, no script per frame. `HeroHorizon` is kept for a later swap.
const COUNT = 16;

const beams = Array.from({ length: COUNT }, (_, i) => ({
  key: i,
  style: {
    '--beam': `color-mix(in srgb, var(--accent-2) ${Math.round((i / (COUNT - 1)) * 100)}%, var(--accent))`,
    // Spread the periods and phases with fixed primes so neighbours never move together.
    animationDuration: `${5 + ((i * 7919) % 50) / 10}s`,
    animationDelay: `${-((i * 3571) % 70) / 10}s`,
  },
}));
</script>

<template>
	<div class="beams" aria-hidden="true">
		<i v-for="beam in beams" :key="beam.key" class="beams__beam" :style="beam.style" />
	</div>
</template>

<style scoped>
.beams {
	position: absolute;
	inset: 0;
	display: flex;
	align-items: flex-end;
	overflow: hidden;
	pointer-events: none;
	mask-image: linear-gradient(to top, #000 20%, transparent 95%);
}

.beams__beam {
	flex: 1;
	height: 100%;
	transform-origin: bottom;
	background: linear-gradient(to top, var(--beam), transparent 85%);
	opacity: 0.22;
	animation: beams-rise 7s ease-in-out infinite alternate;
	will-change: transform, opacity;
}

@keyframes beams-rise {
	from {
		transform: scaleY(0.35);
		opacity: 0.12;
	}

	to {
		transform: scaleY(1);
		opacity: 0.3;
	}
}

@media (prefers-reduced-motion: reduce) {
	.beams__beam {
		animation: none;
		transform: scaleY(0.7);
	}
}
</style>
