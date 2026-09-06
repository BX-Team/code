<script setup lang="ts">
import { ArrowRight, Fingerprint, SlidersHorizontal, Terminal } from '@lucide/vue';

useHead({ title: 'Tools' });

const tools = [
  {
    to: '/tools/flags',
    icon: Terminal,
    name: 'JVM flags generator',
    body: 'Aikar, MeowIce, brucethemoose and hilltty, generated for your heap, Java version, OS and CPU. Every flag is explained, and the ones your JVM would reject are never written.',
  },
  {
    to: '/tools/server-config',
    icon: SlidersHorizontal,
    name: 'Server config generator',
    body: 'Every config file a Paper, Purpur or DivineMC server has, tuned for your server type, player count and cores. Only the keys that differ from the defaults, each with the reason it changed.',
  },
  {
    to: '/tools/uuid',
    icon: Fingerprint,
    name: 'UUID lookup',
    body: 'The online UUID Mojang has for a username and the offline one a cracked server derives from it, with the skin the account is wearing.',
  },
];
</script>

<template>
	<PageShell max-width="1180px" gutter="24px">
		<div class="tools-root">
			<div class="tools-atmosphere" aria-hidden="true" />
			<div class="tools-wrap">
				<header class="tools-head">
					<h1>Tools</h1>
					<p>Small utilities for running a server. Everything runs in your browser, so nothing is uploaded anywhere.</p>
				</header>

				<div class="tools-grid">
					<NuxtLink v-for="tool in tools" :key="tool.to" :to="tool.to" class="tool-card">
						<span class="tool-icon"><component :is="tool.icon" :size="18" :stroke-width="1.6" /></span>
						<h2>{{ tool.name }}</h2>
						<p>{{ tool.body }}</p>
						<span class="tool-go">Open <ArrowRight :size="14" :stroke-width="1.8" /></span>
					</NuxtLink>
				</div>
			</div>
		</div>
	</PageShell>
</template>

<style scoped>
.tools-root {
	position: relative;
	overflow: hidden;
	flex: 1;
}

.tools-atmosphere {
	position: absolute;
	inset: 0 0 auto 0;
	height: 620px;
	pointer-events: none;
	background: radial-gradient(120% 80% at 50% -20%, var(--brand-soft), transparent 60%);
	opacity: 0.5;
}

.tools-wrap {
	position: relative;
	max-width: 1180px;
	margin: 0 auto;
	padding: 56px 24px 96px;
}

.tools-head {
	margin-bottom: 32px;
}

.tools-head h1 {
	margin: 0 0 8px;
	font: 700 34px/1.15 var(--font-heading);
	color: var(--fg-hi);
	letter-spacing: -0.02em;
}

.tools-head p {
	margin: 0;
	max-width: 68ch;
	font: 400 15px/1.6 var(--font-sans);
	color: var(--dim);
}

.tools-grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
	gap: 16px;
}

.tool-card {
	display: flex;
	flex-direction: column;
	gap: 10px;
	padding: 20px;
	border: 1px solid var(--line);
	border-radius: var(--r-lg);
	background: var(--bg-1);
	transition: border-color 0.15s, background-color 0.15s;
}

.tool-card:hover {
	border-color: var(--line-2);
	background: var(--bg-2);
}

.tool-icon {
	display: grid;
	place-items: center;
	width: 36px;
	height: 36px;
	border-radius: var(--r-md);
	background: var(--bg-3);
	color: var(--brand);
}

.tool-card h2 {
	margin: 0;
	font: 600 17px/1.3 var(--font-heading);
	color: var(--fg-hi);
}

.tool-card p {
	margin: 0;
	flex: 1;
	font: 400 13.5px/1.6 var(--font-sans);
	color: var(--dim);
}

.tool-go {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	font: 500 13px/1 var(--font-sans);
	color: var(--brand);
}

@media (max-width: 640px) {
	.tools-wrap {
		padding: 32px 16px 64px;
	}

	.tools-head h1 {
		font-size: 27px;
	}
}
</style>
