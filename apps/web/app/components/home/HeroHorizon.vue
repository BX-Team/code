<script setup lang="ts">
/**
 * A grid floor running to a horizon, drawn as SVG lines in true perspective rather than a
 * 3D-transformed CSS texture, which the browser resamples into blur. The rails converge on the
 * vanishing point and never move; only the cross lines are recomputed each frame as they come closer.
 */
const VIEW_W = 1000;
const VIEW_H = 1000;
/** Where the horizon sits, as a share of the hero's height. */
const HORIZON = 0.6;
const RAILS = 14;
const SPREAD = 260;
const FAR = 16;
/** World units per second the floor travels towards the viewer. */
const SPEED = 0.55;

const hz = VIEW_H * HORIZON;
const depth = VIEW_H - hz;

const rails = Array.from({ length: RAILS * 2 + 1 }, (_, i) => {
  const x = VIEW_W / 2 + (i - RAILS) * SPREAD;
  return `M${VIEW_W / 2} ${hz}L${x} ${VIEW_H}`;
}).join('');

const offset = ref(0);

/** A cross line at world depth z lands at hz + depth / z; z = 1 is the bottom edge. */
const rows = computed(() => {
  const ys: number[] = [];
  for (let z = 1 - offset.value; z <= FAR; z += 1) {
    if (z < 0.98) continue;
    ys.push(hz + depth / z);
  }
  return ys;
});

const id = useId();
let frame = 0;
let visible = true;
let last = 0;
let stop: (() => void) | undefined;
const root = ref<HTMLElement | null>(null);

function tick(now: number) {
  if (last) offset.value = (offset.value + ((now - last) / 1000) * SPEED) % 1;
  last = now;
  frame = requestAnimationFrame(tick);
}

function play() {
  if (frame || !visible || document.hidden) return;
  last = 0;
  frame = requestAnimationFrame(tick);
}

function pause() {
  cancelAnimationFrame(frame);
  frame = 0;
}

onMounted(() => {
  if (!root.value || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const watcher = new IntersectionObserver(([entry]) => {
    visible = !!entry?.isIntersecting;
    if (visible) play();
    else pause();
  });
  watcher.observe(root.value);
  const onVisibility = () => (document.hidden ? pause() : play());
  document.addEventListener('visibilitychange', onVisibility);
  play();
  stop = () => {
    pause();
    watcher.disconnect();
    document.removeEventListener('visibilitychange', onVisibility);
  };
});

onBeforeUnmount(() => stop?.());
</script>

<template>
	<div ref="root" class="horizon" aria-hidden="true">
		<div class="horizon__glow" />
		<svg class="horizon__grid" :viewBox="`0 0 ${VIEW_W} ${VIEW_H}`" preserveAspectRatio="none">
			<defs>
				<linearGradient :id="`${id}-ink`" gradientUnits="userSpaceOnUse" x1="0" y1="0" :x2="VIEW_W" y2="0">
					<stop offset="0" stop-color="var(--accent)" />
					<stop offset="1" stop-color="var(--accent-2)" />
				</linearGradient>
			</defs>
			<g :stroke="`url(#${id}-ink)`" fill="none" vector-effect="non-scaling-stroke">
				<path :d="rails" stroke-width="1" vector-effect="non-scaling-stroke" />
				<line
					v-for="(y, i) in rows"
					:key="i"
					x1="0"
					:x2="VIEW_W"
					:y1="y"
					:y2="y"
					stroke-width="1"
					vector-effect="non-scaling-stroke"
				/>
			</g>
		</svg>
	</div>
</template>

<style scoped>
.horizon {
	position: absolute;
	inset: 0;
	overflow: hidden;
	pointer-events: none;
}

.horizon__grid {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
	opacity: 0.55;
	/* The far rows bunch up into a moiré; they fade out before they get that close. */
	mask-image: linear-gradient(to bottom, transparent 61%, rgba(0, 0, 0, 0.35) 70%, #000 94%);
}

/* An ellipse centred on the horizon, fading every way, so it has no edge of its own. */
.horizon__glow {
	position: absolute;
	left: 10%;
	right: 10%;
	top: calc(60% - 60px);
	height: 120px;
	background: radial-gradient(closest-side, color-mix(in srgb, var(--accent) 16%, transparent), transparent);
}
</style>
