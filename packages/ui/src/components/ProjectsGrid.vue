<script setup lang="ts">
defineProps<{
	eyebrow?: string
	heading: string
}>()
</script>

<template>
	<section class="bx-projects-grid">
		<div class="bx-projects-grid__container">
			<div class="bx-projects-grid__head">
				<p v-if="eyebrow" class="bx-projects-grid__eyebrow">{{ eyebrow }}</p>
				<h2 class="bx-projects-grid__heading">{{ heading }}</h2>
			</div>
			<div class="bx-projects-grid__grid">
				<slot />
			</div>
		</div>
	</section>
</template>

<style scoped>
.bx-projects-grid {
	padding: 80px 0;
}

.bx-projects-grid__container {
	max-width: 1180px;
	margin: 0 auto;
	padding: 0 32px;
}

.bx-projects-grid__head {
	max-width: 720px;
	margin: 0 auto 48px;
	text-align: center;
}

.bx-projects-grid__eyebrow {
	margin: 0 0 8px;
	font: 600 11px/1.4 var(--font-sans);
	text-transform: uppercase;
	letter-spacing: 0.08em;
	color: var(--mute);
}

.bx-projects-grid__heading {
	margin: 0;
	font: 700 30px/1.2 var(--font-heading);
	letter-spacing: -0.015em;
	color: var(--fg-hi);
}

.bx-projects-grid__grid {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: 14px;
}
</style>
