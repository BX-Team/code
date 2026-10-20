<script setup lang="ts">
const counter = ref(0);
provide('stepsCounter', counter);
</script>

<template>
	<div class="steps">
		<slot />
	</div>
</template>

<style scoped>
.steps {
	display: flex;
	flex-direction: column;
	gap: 0;
	margin: 24px 0;
	padding-left: 0;
	position: relative;
}
</style>
