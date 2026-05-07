<script setup lang="ts">
import type { Ref } from 'vue';

const props = defineProps<{
  title?: string;
  n?: number;
}>();

const counter = inject<Ref<number> | null>('stepsCounter', null);

const claimed = ref<number | null>(null);
if (counter) {
  counter.value += 1;
  claimed.value = counter.value;
}

const num = computed(() => props.n ?? claimed.value ?? 1);
</script>

<template>
	<div class="step">
		<div class="step-rail">
			<span class="step-num">{{ num }}</span>
			<span class="step-line" aria-hidden="true" />
		</div>
		<div class="step-body">
			<div v-if="$slots.title || title" class="step-title">
				<slot name="title">{{ title }}</slot>
			</div>
			<div class="step-content">
				<slot />
			</div>
		</div>
	</div>
</template>

<style scoped>
.step {
	display: grid;
	grid-template-columns: 32px 1fr;
	gap: 14px;
	position: relative;
	padding-bottom: 24px;
}
.step:last-child { padding-bottom: 0; }
.step:last-child .step-line { display: none; }

.step-rail {
	position: relative;
	display: flex;
	flex-direction: column;
	align-items: center;
	padding-top: 2px;
}

.step-num {
	position: relative;
	z-index: 1;
	display: inline-grid;
	place-items: center;
	width: 28px;
	height: 28px;
	border-radius: 999px;
	background: var(--bg-1);
	border: 1px solid var(--line);
	color: var(--fg-hi);
	font: 600 12px var(--font-mono);
	letter-spacing: 0;
	flex-shrink: 0;
}

.step-line {
	position: absolute;
	top: 30px;
	bottom: -24px;
	left: 50%;
	width: 1px;
	background: var(--line);
	transform: translateX(-0.5px);
}

.step-body {
	min-width: 0;
	padding-top: 2px;
}

.step-title {
	margin: 0 0 6px;
	font: 600 16px/1.4 var(--font-sans);
	letter-spacing: -0.005em;
	color: var(--fg-hi);
}

.step-content {
	font-size: 14px;
	line-height: 1.6;
	color: var(--fg);
}
.step-content :deep(p) { margin: 0 0 10px; }
.step-content :deep(p:last-child) { margin-bottom: 0; }
.step-content :deep(.code-block) { margin: 12px 0 0; }
.step-content :deep(pre) { margin: 12px 0; }
.step-content :deep(.callout) { margin: 12px 0; }
.step-content :deep(h2),
.step-content :deep(h3),
.step-content :deep(h4) {
	font: 600 14px/1.4 var(--font-sans);
	color: var(--fg-hi);
	margin: 14px 0 6px;
	letter-spacing: -0.005em;
}
.step-content :deep(ol),
.step-content :deep(ul) {
	margin: 0 0 10px;
}
.step-content :deep(li) {
	margin: 2px 0;
	line-height: 1.6;
}
.step-content :deep(li strong) {
	color: var(--fg-hi);
}
</style>
