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
	font: 500 13px/1.4 var(--font-sans);
	color: var(--dim);
}

.bx-input {
	width: 100%;
	height: 38px;
	padding: 0 var(--s-3);
	background: var(--surface-deep);
	border: 1px solid var(--line-2);
	border-radius: var(--r-2);
	color: var(--fg);
	font: 400 14px var(--font-sans);
	transition: border-color 0.15s ease;
	box-sizing: border-box;
}

.bx-input::placeholder {
	color: var(--mute);
}

.bx-input:hover {
	border-color: var(--rule);
}

.bx-input:focus-visible {
	outline: none;
	border-color: var(--edge);
}
</style>
