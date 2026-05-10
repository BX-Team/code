<script setup lang="ts">
import { BrandMark } from '@bx-team/ui';
import { RouterLink, useRoute } from 'vue-router';

const route = useRoute();
</script>

<template>
	<nav class="nav">
		<RouterLink to="/" class="brand">
			<BrandMark :size="22" />
			BX Team Status
		</RouterLink>
		<div class="links">
			<a href="#services">Overview</a>
			<a href="#timeline">History</a>
		</div>
		<RouterLink v-if="route.path === '/admin'" to="/" class="cta">
			<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.7">
				<path d="m15 18-6-6 6-6" />
			</svg>
			Status
		</RouterLink>
	</nav>
</template>

<style scoped>
.nav {
	position: sticky;
	top: 14px;
	z-index: 30;
	margin: 18px auto 0;
	max-width: min(980px, calc(100% - 48px));
	display: flex;
	align-items: center;
	gap: 16px;
	padding: 9px 14px 9px 16px;
	background: color-mix(in oklab, var(--bg-1) 70%, transparent);
	border: 1px solid var(--line);
	border-radius: var(--r-full);
	backdrop-filter: blur(20px);
	-webkit-backdrop-filter: blur(20px);
	box-shadow: var(--shadow-card);
}

.brand {
	display: inline-flex;
	align-items: center;
	gap: 9px;
	font: 700 14px var(--font-sans);
	color: var(--fg-hi);
	letter-spacing: -0.01em;
}

.sep {
	height: 18px;
	width: 1px;
	background: var(--line);
}

.crumb {
	font: 500 13px var(--font-sans);
	color: var(--dim);
}

.links {
	margin-left: auto;
	display: inline-flex;
	align-items: center;
	gap: 4px;
}

.links a {
	padding: 6px 12px;
	border-radius: var(--r-full);
	font: 500 12.5px var(--font-sans);
	color: var(--dim);
}

.links a:hover {
	background: rgba(255, 255, 255, 0.05);
	color: var(--fg-hi);
}

.cta {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	padding: 6px 12px;
	background: var(--bg-2);
	border: 1px solid var(--line);
	border-radius: var(--r-full);
	font: 500 12.5px var(--font-sans);
	color: var(--fg-hi);
}

.cta:hover {
	border-color: var(--line-2);
}

@media (max-width: 760px) {
	.nav {
		margin-top: 12px;
	}

	.crumb {
		display: none;
	}
}
</style>
