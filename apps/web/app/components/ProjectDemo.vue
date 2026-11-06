<script setup lang="ts">
import { Maximize2, Play, RotateCcw } from '@lucide/vue';
import type { ProjectDemo } from '~/config/projects';
import { demoPage } from '~/lib/demo';

const props = defineProps<{ demo: ProjectDemo; logo?: string }>();

const started = ref(false);
const run = ref(0);
const box = ref<HTMLElement | null>(null);
const frame = ref<HTMLIFrameElement | null>(null);
const scale = ref(1);

const page = computed(() => demoPage(props.demo));

// The interface is laid out for a desktop window; a narrow screen gets the same window, smaller.
let observer: ResizeObserver | null = null;
onMounted(() => {
  observer = new ResizeObserver(([entry]) => {
    if (entry) scale.value = Math.min(1, entry.contentRect.width / props.demo.width);
  });
  if (box.value) observer.observe(box.value);
});
onBeforeUnmount(() => observer?.disconnect());

// Before it starts the box holds the poster, which needs room on a phone however small the scale.
const boxHeight = computed(() => {
  const scaled = props.demo.height * scale.value;
  return started.value ? scaled : Math.max(scaled, 340);
});

function start() {
  started.value = true;
  run.value++;
}

function fullscreen() {
  frame.value?.requestFullscreen?.();
}
</script>

<template>
	<div class="demo">
		<div ref="box" class="demo__box" :style="{ height: `${boxHeight}px` }">
			<iframe
				v-if="started"
				:key="run"
				ref="frame"
				class="demo__frame"
				:title="`${demo.title} demo`"
				:srcdoc="page"
				allow="fullscreen"
				:style="{ width: `${demo.width}px`, height: `${demo.height}px`, transform: `scale(${scale})` }"
			/>
			<button v-else type="button" class="demo__poster" @click="start">
				<img v-if="logo" :src="logo" alt="" width="56" height="56" />
				<span class="demo__title">Try {{ demo.title }} in your browser</span>
				<span class="demo__hint">The real interface, compiled to WebAssembly. Nothing is installed.</span>
				<span class="demo__go"><Play :size="16" :stroke-width="2" /> Launch the demo</span>
			</button>
		</div>
		<div v-if="started" class="demo__bar">
			<span>Sample instances. Play goes through a launch without starting the game.</span>
			<span class="demo__acts">
				<button type="button" @click="start"><RotateCcw :size="14" /> Restart</button>
				<button type="button" @click="fullscreen"><Maximize2 :size="14" /> Full screen</button>
			</span>
		</div>
	</div>
</template>

<style scoped>
.demo {
	display: flex;
	flex-direction: column;
	gap: var(--s-3);
}

.demo__box {
	position: relative;
	overflow: hidden;
	border: 1px solid var(--line);
	border-radius: var(--r-3);
	background: #141414;
}

.demo__frame {
	position: absolute;
	top: 0;
	left: 0;
	border: 0;
	transform-origin: 0 0;
}

.demo__poster {
	position: absolute;
	inset: 0;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 10px;
	padding: var(--s-6);
	border: 0;
	background:
		radial-gradient(60% 70% at 50% 40%, color-mix(in srgb, var(--accent) 10%, transparent), transparent 70%),
		var(--surface-deep);
	color: var(--fg);
	text-align: center;
	cursor: pointer;
}

.demo__poster img {
	border-radius: 12px;
	margin-bottom: 4px;
}

.demo__title {
	font: 700 clamp(18px, 2.4vw, 24px) / 1.2 var(--font-sans);
	letter-spacing: -0.02em;
	color: var(--fg-hi);
}

.demo__hint {
	max-width: 46ch;
	font: 400 14px/1.55 var(--font-sans);
	color: var(--dim);
}

.demo__go {
	display: inline-flex;
	align-items: center;
	gap: 8px;
	min-height: 44px;
	margin-top: 8px;
	padding: 0 20px;
	border-radius: var(--r-2);
	background: var(--fg-hi);
	color: var(--surface-deep);
	font: 600 14px/1 var(--font-sans);
	transition: background-color 0.15s ease;
}

.demo__poster:hover .demo__go {
	background: var(--fg);
}

.demo__bar {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: 8px 16px;
	font: 400 13px/1.5 var(--font-sans);
	color: var(--mute);
}

.demo__acts {
	display: flex;
	gap: 8px;
}

.demo__acts button {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	min-height: 44px;
	padding: 0 14px;
	border: 1px solid var(--line-2);
	border-radius: var(--r-2);
	background: transparent;
	color: var(--dim);
	font: 500 13px/1 var(--font-sans);
	cursor: pointer;
}

.demo__acts button:hover {
	background: var(--surface-2);
	color: var(--fg-hi);
}
</style>
