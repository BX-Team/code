<script setup lang="ts">
defineProps<{ title: string; lead: string }>();
</script>

<template>
	<PageShell max-width="1180px" gutter="24px">
		<div class="tool-root">
			<div class="tool-atmosphere" aria-hidden="true" />
			<div class="tool-wrap">
				<header class="tool-head">
					<NuxtLink to="/tools" class="tool-back">Tools</NuxtLink>
					<h1>{{ title }}</h1>
					<p>{{ lead }}</p>
				</header>

				<slot />
			</div>
		</div>
	</PageShell>
</template>

<style scoped>
.tool-root {
	position: relative;
	overflow: hidden;
	flex: 1;
}

/* Same ambient glow as /downloads, so the sections read as one site. */
.tool-atmosphere {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	height: 760px;
	pointer-events: none;
	overflow: hidden;
	z-index: 0;
}

.tool-atmosphere::before {
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
	opacity: 0.45;
}

.tool-atmosphere::after {
	content: '';
	position: absolute;
	inset: 0;
	background-image:
		linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
		linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
	background-size: 56px 56px;
	mask-image: radial-gradient(ellipse 80% 60% at 50% 30%, black 0%, transparent 75%);
	-webkit-mask-image: radial-gradient(ellipse 80% 60% at 50% 30%, black 0%, transparent 75%);
}

.tool-wrap {
	position: relative;
	z-index: 1;
	max-width: 1180px;
	margin: 0 auto;
	padding: 40px 24px 96px;
}

.tool-head {
	margin-bottom: 28px;
}

.tool-back {
	font: 500 12px/1 var(--font-sans);
	letter-spacing: 0.06em;
	text-transform: uppercase;
	color: var(--mute);
}

.tool-back:hover {
	color: var(--brand);
}

.tool-head h1 {
	margin: 12px 0 8px;
	font: 700 32px/1.15 var(--font-heading);
	color: var(--fg-hi);
	letter-spacing: -0.02em;
}

.tool-head p {
	margin: 0;
	max-width: 68ch;
	font: 400 15px/1.6 var(--font-sans);
	color: var(--dim);
}

@media (max-width: 640px) {
	.tool-wrap {
		padding: 24px 14px 56px;
	}

	.tool-head {
		margin-bottom: 20px;
	}

	.tool-head h1 {
		font-size: 24px;
	}

	.tool-head p {
		font-size: 14px;
	}
}
</style>
