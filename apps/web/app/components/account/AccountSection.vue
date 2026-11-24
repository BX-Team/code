<script setup lang="ts">
defineProps<{ id: string; title?: string; lead?: string }>();
</script>

<template>
	<section :id="id" class="as">
		<header v-if="title || $slots.actions" class="as__head">
			<div class="as__text">
				<h2 v-if="title" class="as__title">{{ title }}</h2>
				<p v-if="lead" class="as__lead">{{ lead }}</p>
			</div>
			<div v-if="$slots.actions" class="as__actions">
				<slot name="actions" />
			</div>
		</header>
		<div class="as__body">
			<slot />
		</div>
	</section>
</template>

<style scoped>
.as {
	display: flex;
	flex-direction: column;
	gap: var(--s-5);
	padding: var(--s-6);
	border: 1px solid var(--line);
	border-radius: var(--r-4);
	background: var(--surface-card);
	scroll-margin-top: calc(102px + var(--s-4));
}

.as__head {
	display: flex;
	flex-wrap: wrap;
	align-items: flex-start;
	justify-content: space-between;
	gap: var(--s-3) var(--s-6);
}

.as__text {
	display: flex;
	flex: 1 1 300px;
	flex-direction: column;
	gap: 4px;
	max-width: 52ch;
}

.as__actions {
	flex: none;
}

.as__title {
	margin: 0;
	font: 700 17px/1.3 var(--font-sans);
	letter-spacing: -0.02em;
	color: var(--fg-hi);
}

.as__lead {
	margin: 0;
	font: 400 13.5px/1.55 var(--font-sans);
	color: var(--dim);
}

.as__body {
	display: flex;
	flex-direction: column;
	gap: var(--s-4);
}

@media (max-width: 640px) {
	.as {
		padding: var(--s-5) var(--s-4);
	}
}
</style>
