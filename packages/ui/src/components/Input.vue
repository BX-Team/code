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
	gap: 4px;
}

.bx-input-label {
	font: 500 12px var(--font-sans);
	color: var(--dim);
}

.bx-input {
	width: 100%;
	height: 38px;
	padding: 0 12px;
	background: var(--bg-3);
	border: 1px solid var(--line);
	border-radius: var(--r-md);
	color: var(--fg-hi);
	font: 400 13.5px var(--font-sans);
	font-family: inherit;
	transition: border-color 0.15s, box-shadow 0.15s;
	box-sizing: border-box;
}

.bx-input::placeholder {
	color: var(--mute);
}

.bx-input:focus {
	outline: none;
	border-color: var(--brand);
	box-shadow: var(--shadow-glow);
}
</style>
