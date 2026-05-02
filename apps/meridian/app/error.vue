<script setup lang="ts">
import { Navbar, Button } from '@bx-team/ui'
import { Home, ArrowLeft, AlertCircle } from '@lucide/vue'

defineProps<{
	error: { statusCode?: number; statusMessage?: string; message?: string }
}>()

const handleError = () => clearError({ redirect: '/' })
</script>

<template>
	<div class="err-page">
		<div class="err-atmosphere" aria-hidden="true" />

		<Navbar />

		<main class="err-main">
			<div class="err-card">
				<div class="err-icon">
					<AlertCircle :size="36" :stroke-width="1.5" />
				</div>
				<div class="err-code">{{ error.statusCode || 500 }}</div>
				<h1>
					{{
						error.statusCode === 404
							? 'Page not found'
							: error.statusCode === 403
								? 'Access denied'
								: 'Something went wrong'
					}}
				</h1>
				<p>
					{{
						error.statusMessage
							|| (error.statusCode === 404
								? "The page you're looking for doesn't exist or has been moved."
								: 'An unexpected error occurred. Please try again or head back home.')
					}}
				</p>
				<div class="err-cta">
					<Button variant="primary" @click="handleError">
						<Home :size="16" :stroke-width="1.7" />
						Back home
					</Button>
					<Button variant="ghost" href="javascript:history.back()">
						<ArrowLeft :size="16" :stroke-width="1.7" />
						Go back
					</Button>
				</div>
			</div>
		</main>
	</div>
</template>

<style scoped>
.err-page {
	position: relative;
	min-height: 100vh;
	overflow: hidden;
}

.err-atmosphere {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	height: 100vh;
	pointer-events: none;
	z-index: 0;
}

.err-atmosphere::before {
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

.err-main {
	position: relative;
	z-index: 1;
	min-height: 80vh;
	display: grid;
	place-items: center;
	padding: 60px 24px 100px;
}

.err-card {
	max-width: 560px;
	text-align: center;
	border: 1px solid var(--line);
	border-radius: 16px;
	padding: 48px 40px;
	background: oklch(0.16 0.006 240 / 0.6);
	backdrop-filter: blur(12px);
	box-shadow:
		0 1px 0 rgba(255, 255, 255, 0.04) inset,
		0 40px 100px -30px rgba(0, 0, 0, 0.7),
		0 0 80px -20px var(--brand-soft);
}

.err-icon {
	display: inline-grid;
	place-items: center;
	width: 64px;
	height: 64px;
	border-radius: 16px;
	background: var(--brand-soft);
	color: var(--brand);
	margin-bottom: 20px;
}

.err-code {
	font: 600 14px var(--font-mono);
	color: var(--brand);
	letter-spacing: 0.12em;
	margin-bottom: 8px;
}

.err-card h1 {
	font-size: clamp(28px, 4vw, 40px);
	font-weight: 700;
	letter-spacing: -0.025em;
	color: var(--fg-hi);
	margin: 0 0 14px;
}

.err-card p {
	color: var(--dim);
	font-size: 15.5px;
	line-height: 1.55;
	margin: 0 0 28px;
}

.err-cta {
	display: flex;
	gap: 10px;
	justify-content: center;
	flex-wrap: wrap;
}
</style>
