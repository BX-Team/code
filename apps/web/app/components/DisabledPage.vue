<script setup lang="ts">
import { Button } from '@bx-team/ui';
import { Home, PowerOff } from '@lucide/vue';

defineProps<{
  message?: string;
}>();
</script>

<template>
	<div class="disabled-page">
		<div class="disabled-atmosphere" aria-hidden="true" />

		<main class="disabled-main">
			<div class="disabled-card">
				<div class="disabled-icon">
					<PowerOff :size="36" :stroke-width="1.5" />
				</div>
				<div class="disabled-label">PAGE UNAVAILABLE</div>
				<h1>This page is disabled</h1>
				<p>{{ message || 'This page is currently unavailable. Check back later.' }}</p>
				<Button variant="primary" href="/">
					<Home :size="16" :stroke-width="1.7" />
					Back home
				</Button>
			</div>
		</main>
	</div>
</template>

<style scoped>
.disabled-page {
	position: relative;
	min-height: 100vh;
	overflow: hidden;
}

.disabled-atmosphere {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	height: 100vh;
	pointer-events: none;
	z-index: 0;
}

.disabled-atmosphere::before {
	content: '';
	position: absolute;
	top: -100px;
	left: 50%;
	transform: translateX(-50%);
	width: 900px;
	height: 600px;
	background: radial-gradient(
		ellipse 50% 45% at 50% 50%,
		color-mix(in oklab, var(--brand-glow) 50%, var(--brand-glow-2)),
		transparent 70%
	);
	filter: blur(60px);
	opacity: 0.35;
}

.disabled-main {
	position: relative;
	z-index: 1;
	min-height: 100vh;
	display: grid;
	place-items: center;
	padding: 60px 24px;
}

.disabled-card {
	max-width: 560px;
	text-align: center;
	border: 1px solid var(--line);
	border-radius: 16px;
	padding: 48px 40px;
	background: color-mix(in oklab, var(--bg-1) 60%, transparent);
	backdrop-filter: blur(12px);
	box-shadow: var(--shadow-pop);
}

.disabled-icon {
	display: inline-grid;
	place-items: center;
	width: 64px;
	height: 64px;
	border-radius: 16px;
	background: var(--brand-soft);
	color: var(--brand);
	margin-bottom: 20px;
}

.disabled-label {
	font: 600 14px var(--font-mono);
	color: var(--brand);
	letter-spacing: 0.12em;
	margin-bottom: 8px;
}

.disabled-card h1 {
	font-size: clamp(28px, 4vw, 40px);
	font-weight: 700;
	letter-spacing: -0.025em;
	color: var(--fg-hi);
	margin: 0 0 14px;
}

.disabled-card p {
	color: var(--dim);
	font-size: 15.5px;
	line-height: 1.55;
	margin: 0 0 28px;
}
</style>
