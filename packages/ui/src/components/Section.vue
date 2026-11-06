<script setup lang="ts">
defineProps<{
  id?: string;
  eyebrow?: string;
  title?: string;
  lede?: string;
}>();
</script>

<template>
	<section :id="id" class="bx-section">
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
	padding: var(--s-16) var(--s-4) 0;
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
	margin-bottom: var(--s-6);
}

.bx-section__text {
	display: flex;
	flex-direction: column;
	gap: var(--s-3);
	max-width: 40rem;
}

.bx-section__eyebrow {
	margin: 0;
	font: 500 12px/1.4 var(--font-mono);
	letter-spacing: 0.1em;
	text-transform: uppercase;
	color: var(--accent-2);
}

.bx-section__title {
	margin: 0;
	font: 800 clamp(26px, 3vw, 34px) / 1.1 var(--font-sans);
	letter-spacing: -0.04em;
	color: var(--fg);
	text-wrap: balance;
}

.bx-section__lede {
	margin: 0;
	font: 400 15px/1.6 var(--font-sans);
	color: var(--dim);
	text-wrap: pretty;
}

.bx-section__action {
	flex-shrink: 0;
}

@media (max-width: 860px) {
	.bx-section {
		padding: var(--s-12) var(--s-4) 0;
	}

	.bx-section__head {
		flex-direction: column;
		align-items: flex-start;
		gap: var(--s-4);
		margin-bottom: var(--s-5);
	}
}
</style>
