<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{ size?: number }>(), { size: 22 })

const r = (n: number) => `${Math.round(props.size * n)}px`
const style = computed(() => ({
	width: `${props.size}px`,
	height: `${props.size}px`,
	'--bm-r':        r(0.273),
	'--bm-glow':     r(0.636),
	'--bm-inset':    r(0.227),
	'--bm-inner-r':  r(0.136),
	'--bm-dot':      r(0.273),
	'--bm-dot-r':    r(0.045),
	'--bm-dot-glow': r(0.364),
}))
</script>

<template>
	<span class="bm" :style="style" aria-hidden="true" />
</template>

<style scoped>
.bm {
	display: inline-block;
	flex-shrink: 0;
	position: relative;
	border-radius: var(--bm-r);
	background: conic-gradient(from 200deg, var(--brand), var(--brand-2), oklch(0.55 0.13 200), var(--brand));
	box-shadow: 0 0 var(--bm-glow) color-mix(in oklab, var(--brand-soft) 60%, var(--brand-soft-2));
}
.bm::after {
	content: "";
	position: absolute;
	inset: var(--bm-inset);
	background: var(--bg-0);
	border-radius: var(--bm-inner-r);
}
.bm::before {
	content: "";
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	width: var(--bm-dot);
	height: var(--bm-dot);
	background: var(--brand);
	border-radius: var(--bm-dot-r);
	z-index: 1;
	box-shadow: 0 0 var(--bm-dot-glow) var(--brand);
}
</style>
