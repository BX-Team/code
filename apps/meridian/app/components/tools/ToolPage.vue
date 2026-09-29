<script setup lang="ts">
defineProps<{ title: string; lead: string }>();
</script>

<template>
	<PageShell max-width="1180px" gutter="24px">
		<div class="tool-root">
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
	font: 500 12px/1 var(--font-mono);
	letter-spacing: 0.06em;
	text-transform: uppercase;
	color: var(--mute);
}

.tool-back:hover {
	color: var(--brand);
}

.tool-head h1 {
	margin: 12px 0 8px;
	font: 600 32px/1.15 var(--font-heading);
	color: var(--fg-hi);
	letter-spacing: -0.02em;
}

.tool-head p {
	margin: 0;
	max-width: 68ch;
	font: 400 15px/1.6 var(--font-mono);
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
