<script setup lang="ts">
const props = withDefaults(defineProps<{ size?: number }>(), { size: 22 });
</script>

<template>
	<span class="bx-mark" :style="{ '--mark-size': `${props.size}px` }" aria-hidden="true">
		<span class="bx-mark__frame" />
		<span class="bx-mark__core" />
	</span>
</template>

<style scoped>
.bx-mark {
	position: relative;
	display: inline-block;
	flex-shrink: 0;
	width: var(--mark-size);
	height: var(--mark-size);
	border-radius: calc(var(--mark-size) * 6 / 22);
	background: linear-gradient(
		to bottom left,
		var(--brand) 0%,
		var(--brand-2) 40%,
		var(--brand) 72%,
		var(--brand-2) 100%
	);
}

.bx-mark__frame,
.bx-mark__core {
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
}

.bx-mark__frame {
	width: calc(var(--mark-size) * 12 / 22);
	height: calc(var(--mark-size) * 12 / 22);
	border-radius: calc(var(--mark-size) * 3 / 22);
	background: var(--bg-0);
}

.bx-mark__core {
	width: calc(var(--mark-size) * 6 / 22);
	height: calc(var(--mark-size) * 6 / 22);
	border-radius: calc(var(--mark-size) * 1 / 22);
	background: var(--brand);
}
</style>
