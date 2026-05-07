<script setup lang="ts">
defineProps<{ title: string; href: string }>();
</script>

<template>
	<NuxtLink :to="href" class="card">
		<div class="card-title">{{ title }}</div>
		<p class="card-desc"><slot /></p>
	</NuxtLink>
</template>

<style scoped>
.card {
	display: flex;
	flex-direction: column;
	padding: 16px;
	background: var(--bg-1);
	border: 1px solid var(--line);
	border-radius: 10px;
	text-decoration: none;
	color: inherit;
	transition: border-color .15s, background .15s;
	gap: 6px;
}
.card:hover {
	border-color: var(--line-2);
	background: var(--bg-2);
}
.card-title {
	font: 600 14px var(--font-sans);
	color: var(--fg-hi);
}
.card-desc {
	font: 400 13px/1.5 var(--font-sans);
	color: var(--dim);
	margin: 0;
}
</style>
