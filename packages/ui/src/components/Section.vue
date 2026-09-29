<script setup lang="ts">
defineProps<{
  id?: string;
  eyebrow?: string;
  title?: string;
  lede?: string;
  alt?: boolean;
}>();
</script>

<template>
	<section :id="id" class="bx-section" :class="{ 'bx-section--alt': alt }">
		<div class="bx-section__container">
			<div v-if="title || $slots.action" class="bx-section__head">
				<div class="bx-section__text">
					<p v-if="eyebrow" class="bx-section__eyebrow">{{ eyebrow }}</p>
					<h2 v-if="title" class="bx-section__title">{{ title }}</h2>
					<p v-if="lede" class="bx-section__lede">{{ lede }}</p>
				</div>
				<div v-if="$slots.action" class="bx-section__action">
					<slot name="action" />
				</div>
			</div>
			<slot />
		</div>
	</section>
</template>

<style scoped>
.bx-section {
	padding: var(--s-24) var(--s-8);
	background: var(--surface-1);
	border-top: 1px solid var(--line);
}

.bx-section--alt {
	background: var(--surface-0);
}

.bx-section__container {
	max-width: var(--container);
	margin: 0 auto;
}

.bx-section__head {
	display: flex;
	align-items: flex-end;
	justify-content: space-between;
	gap: var(--s-8);
	margin-bottom: var(--s-10);
}

.bx-section__text {
	display: flex;
	flex-direction: column;
	gap: var(--s-4);
	max-width: 36rem;
}

.bx-section__eyebrow {
	margin: 0 0 calc(var(--s-2) * -1);
	font: 500 10.5px/1.4 var(--font-mono);
	letter-spacing: 0.14em;
	text-transform: uppercase;
	color: var(--mute);
}

.bx-section__title {
	margin: 0;
	font: 600 32px/1.15 var(--font-sans);
	letter-spacing: -0.018em;
	color: var(--fg);
	text-wrap: balance;
}

.bx-section__lede {
	margin: 0;
	font: 400 15px/1.6 var(--font-mono);
	color: var(--dim);
	text-wrap: pretty;
}

.bx-section__action {
	flex-shrink: 0;
}

@media (max-width: 860px) {
	.bx-section {
		padding: var(--s-16) var(--s-4);
	}

	.bx-section__head {
		flex-direction: column;
		align-items: flex-start;
		gap: var(--s-4);
		margin-bottom: var(--s-8);
	}

	.bx-section__title {
		font-size: 26px;
	}
}
</style>
