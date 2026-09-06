<script setup lang="ts">
import { ChevronRight } from '@lucide/vue';
import { ref } from 'vue';

defineProps<{ hint?: string }>();
const open = ref(false);
</script>

<template>
	<div class="more">
		<button type="button" class="more-toggle" :aria-expanded="open" @click="open = !open">
			<ChevronRight class="chevron" :class="{ open }" :size="14" :stroke-width="2" />
			<span>More options</span>
			<span v-if="hint && !open" class="more-hint">{{ hint }}</span>
		</button>
		<div v-if="open" class="more-body">
			<slot />
		</div>
	</div>
</template>

<style scoped>
.more {
	margin-top: 14px;
	padding-top: 12px;
	border-top: 1px solid var(--line);
}

.more-toggle {
	display: inline-flex;
	align-items: center;
	gap: 8px;
	min-height: 32px;
	padding: 0;
	border: 0;
	background: transparent;
	color: var(--dim);
	font: 500 13px/1 var(--font-sans);
	cursor: pointer;
	text-align: left;
}

.more-toggle:hover {
	color: var(--fg-hi);
}

.chevron {
	flex: none;
	color: var(--mute);
	transition: transform 0.15s;
}

.chevron.open {
	transform: rotate(90deg);
}

.more-hint {
	font-weight: 400;
	color: var(--mute);
}

.more-body {
	margin-top: 12px;
}

@media (max-width: 640px) {
	.more-hint {
		display: none;
	}
}
</style>
