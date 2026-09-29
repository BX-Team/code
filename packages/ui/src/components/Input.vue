<script setup lang="ts">
const model = defineModel<string>();

defineProps<{
  label?: string;
  placeholder?: string;
  type?: string;
}>();
</script>

<template>
	<div class="bx-input-wrap">
		<label v-if="label" class="bx-input-label">{{ label }}</label>
		<input
			v-model="model"
			class="bx-input"
			:type="type ?? 'text'"
			:placeholder="placeholder"
		/>
	</div>
</template>

<style scoped>
.bx-input-wrap {
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.bx-input-label {
	font: 500 11px/1.4 var(--font-mono);
	letter-spacing: 0.1em;
	text-transform: uppercase;
	color: var(--mute);
}

.bx-input {
	width: 100%;
	height: 40px;
	padding: 0 var(--s-3);
	background: var(--surface-3);
	border: 1px solid var(--edge);
	border-radius: var(--r-2);
	color: var(--fg);
	font: 400 14px var(--font-mono);
	transition: border-color 0.15s ease;
	box-sizing: border-box;
}

.bx-input::placeholder {
	color: var(--mute);
}

.bx-input:hover {
	border-color: var(--fg);
}

.bx-input:focus-visible {
	outline: 2px solid var(--ring);
	outline-offset: 2px;
}
</style>
