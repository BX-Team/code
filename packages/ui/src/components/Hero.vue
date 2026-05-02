<script setup lang="ts">
defineProps<{
	kicker?: string
	kickerBadge?: string
	lede?: string
	noAtmosphere?: boolean
}>()
</script>

<template>
	<div class="bx-hero-outer">
		<div v-if="!noAtmosphere" class="bx-atmosphere" aria-hidden="true" />

		<section class="bx-hero">
			<slot name="kicker">
				<div v-if="kicker" class="bx-hero__kicker">
					<span class="bx-hero__kicker-badge">{{ kickerBadge ?? 'NEW' }}</span>
					{{ kicker }}
				</div>
			</slot>

			<h1 class="bx-hero__h">
				<slot name="title" />
			</h1>

			<p v-if="lede" class="bx-hero__lede">{{ lede }}</p>
			<slot name="lede" />

			<div class="bx-hero__cta">
				<slot name="cta" />
			</div>
		</section>
	</div>
</template>

<style scoped>
.bx-hero-outer {
	position: relative;
	overflow: hidden;
}

.bx-atmosphere {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	height: 920px;
	pointer-events: none;
	z-index: 0;
}

.bx-atmosphere::before {
	content: '';
	position: absolute;
	top: -200px;
	left: 50%;
	transform: translateX(-50%);
	width: 1200px;
	height: 800px;
	background: radial-gradient(
		ellipse 50% 45% at 50% 50%,
		color-mix(in oklab, var(--brand-glow) 70%, var(--brand-glow-2)),
		transparent 70%
	);
	filter: blur(50px);
	opacity: 0.55;
}

.bx-atmosphere::after {
	content: '';
	position: absolute;
	inset: 0;
	background-image:
		linear-gradient(to right,  rgba(255, 255, 255, 0.03) 1px, transparent 1px),
		linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
	background-size: 56px 56px;
	mask-image: radial-gradient(ellipse 80% 60% at 50% 30%, black 0%, transparent 75%);
	-webkit-mask-image: radial-gradient(ellipse 80% 60% at 50% 30%, black 0%, transparent 75%);
}

.bx-hero {
	position: relative;
	z-index: 1;
	padding: 92px 32px 56px;
	text-align: center;
	max-width: 880px;
	margin: 0 auto;
}

.bx-hero__kicker {
	display: inline-flex;
	align-items: center;
	gap: 8px;
	padding: 5px 12px 5px 5px;
	background: color-mix(in oklab, var(--bg-1) 70%, transparent);
	border: 1px solid var(--line);
	border-radius: var(--r-full);
	font: 500 12.5px var(--font-sans);
	color: var(--dim);
	margin-bottom: 28px;
}

.bx-hero__kicker-badge {
	font: 600 10px var(--font-mono);
	color: var(--bg-0);
	background: var(--brand);
	padding: 3px 8px;
	border-radius: var(--r-full);
	letter-spacing: 0.04em;
}

.bx-hero__h {
	font: 600 76px/1 var(--font-sans);
	letter-spacing: -0.04em;
	margin: 0 0 22px;
	color: var(--fg-hi);
	text-wrap: balance;
}

.bx-hero__lede {
	font-size: 19px;
	line-height: 1.55;
	color: var(--dim);
	max-width: 60ch;
	margin: 0 auto 34px;
	text-wrap: pretty;
}

.bx-hero__cta {
	display: flex;
	gap: 12px;
	justify-content: center;
}
</style>
