<script setup lang="ts">
export interface Segment {
  value: string;
  label: string;
  hint?: string;
}

defineProps<{ label: string; options: Segment[]; hint?: string }>();
const model = defineModel<string>({ required: true });
</script>

<template>
	<div class="seg-field">
		<div class="seg-label">
			{{ label }}
			<span v-if="hint" class="seg-hint">{{ hint }}</span>
		</div>
		<div class="seg" role="radiogroup" :aria-label="label">
			<button
				v-for="option in options"
				:key="option.value"
				type="button"
				role="radio"
				:aria-checked="model === option.value"
				class="seg-btn"
				:class="{ active: model === option.value }"
				:title="option.hint"
				@click="model = option.value"
			>
				{{ option.label }}
			</button>
		</div>
	</div>
</template>

<style scoped>
.seg-field {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.seg-label {
	display: flex;
	align-items: baseline;
	gap: 8px;
	font: 600 11px/1.4 var(--font-sans);
	text-transform: uppercase;
	letter-spacing: 0.08em;
	color: var(--mute);
}

.seg-hint {
	text-transform: none;
	letter-spacing: 0;
	font-weight: 400;
	color: var(--mute);
}

.seg {
	display: flex;
	flex-wrap: wrap;
	gap: 4px;
	padding: 4px;
	background: var(--bg-1);
	border: 1px solid var(--line);
	border-radius: var(--r-md);
}

.seg-btn {
	flex: 1 1 auto;
	min-height: 34px;
	min-width: 44px;
	padding: 0 12px;
	border: 0;
	border-radius: var(--r-sm);
	background: transparent;
	color: var(--dim);
	font: 500 13px/1 var(--font-sans);
	cursor: pointer;
	transition: background-color 0.15s, color 0.15s;
}

.seg-btn:hover {
	background: var(--bg-2);
	color: var(--fg-hi);
}

.seg-btn.active {
	background: var(--bg-3);
	color: var(--fg-hi);
	box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--fg) 26%, var(--line));
}
</style>
