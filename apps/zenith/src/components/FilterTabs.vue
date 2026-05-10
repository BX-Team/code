<script setup lang="ts">
const props = defineProps<{
  groups: string[];
  modelValue: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();
</script>

<template>
	<div class="tabs">
		<span
			class="t"
			:class="{ active: modelValue === '' }"
			@click="emit('update:modelValue', '')"
		>
			All systems
		</span>
		<span
			v-for="group in groups"
			:key="group"
			class="t"
			:class="{ active: modelValue === group }"
			@click="emit('update:modelValue', group)"
		>
			{{ group }}
		</span>
	</div>
</template>

<style scoped>
.tabs {
	display: flex;
	width: fit-content;
	background: var(--bg-1);
	border: 1px solid var(--line);
	border-radius: var(--r-full);
	padding: 3px;
	margin-bottom: 20px;
	max-width: 100%;
	overflow-x: auto;
	scrollbar-width: none;
}

.tabs::-webkit-scrollbar {
	display: none;
}

.t {
	padding: 6px 14px;
	font: 500 12.5px var(--font-sans);
	color: var(--dim);
	border-radius: var(--r-full);
	cursor: pointer;
	user-select: none;
}

.t.active {
	background: var(--bg-3);
	color: var(--fg-hi);
}

.t:hover:not(.active) {
	color: var(--fg-hi);
}
</style>
