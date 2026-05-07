<script setup lang="ts">
defineProps<{
  eyebrow?: string;
  heading: string;
  lede?: string;
}>();
</script>

<template>
	<section class="bx-feature-grid">
		<div class="bx-feature-grid__container">
			<div class="bx-feature-grid__head">
				<p v-if="eyebrow" class="bx-feature-grid__eyebrow">{{ eyebrow }}</p>
				<h2 class="bx-feature-grid__heading">{{ heading }}</h2>
				<p v-if="lede" class="bx-feature-grid__lede">{{ lede }}</p>
			</div>
			<div class="bx-feature-grid__grid">
				<slot />
			</div>
		</div>
	</section>
</template>

<style scoped>
.bx-feature-grid {
	padding: 80px 0;
}

.bx-feature-grid__container {
	max-width: 1180px;
	margin: 0 auto;
	padding: 0 32px;
}

.bx-feature-grid__head {
	max-width: 720px;
	margin: 0 auto 48px;
	text-align: center;
}

.bx-feature-grid__eyebrow {
	margin: 0 0 8px;
	font: 600 11px/1.4 var(--font-sans);
	text-transform: uppercase;
	letter-spacing: 0.08em;
	color: var(--mute);
}

.bx-feature-grid__heading {
	margin: 0 0 16px;
	font: 700 30px/1.2 var(--font-heading);
	letter-spacing: -0.015em;
	color: var(--fg-hi);
}

.bx-feature-grid__lede {
	margin: 0;
	font: 400 17px/1.55 var(--font-sans);
	color: var(--dim);
}

.bx-feature-grid__grid {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: 14px;
}
</style>
