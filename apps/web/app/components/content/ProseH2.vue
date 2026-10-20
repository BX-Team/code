<script setup lang="ts">
defineProps<{ id?: string }>();
</script>

<template>
	<h2 :id="id">
		<a v-if="id" :href="`#${id}`" class="anchor" aria-label="Link to section">#</a>
		<slot />
	</h2>
</template>

<style scoped>
h2 {
	position: relative;
}
.anchor {
	position: absolute;
	left: -22px;
	top: 50%;
	transform: translateY(-50%);
	color: var(--mute);
	opacity: 0;
	transition: opacity 0.15s;
	font: 500 14px var(--font-mono);
	text-decoration: none;
}
h2:hover .anchor {
	opacity: 1;
}
</style>
