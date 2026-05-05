<script setup lang="ts">
import { Cuboid, DollarSign, Atom, Globe, ArrowRight } from '@lucide/vue'

definePageMeta({ layout: 'docs' })

useState('docs:toc', () => [])

useHead({ title: 'Documentation' })

const projects = [
	{
		id: 'divinemc',
		title: 'DivineMC',
		description: 'Multi-functional fork of Purpur focused on flexibility and optimization. Features parallel world ticking, async operations, and secure seed.',
		icon: Cuboid,
		tag: 'Server Software',
	},
	{
		id: 'ndailyrewards',
		title: 'NDailyRewards',
		description: 'Lightweight plugin to reward players for playing on your server every day. Fully configurable rewards, PlaceholderAPI support.',
		icon: DollarSign,
		tag: 'Plugin',
	},
	{
		id: 'quark',
		title: 'Quark',
		description: 'Runtime dependency management for plugins on Minecraft server platforms. Works with Bukkit, Paper, and Velocity.',
		icon: Atom,
		tag: 'Library',
	},
]
</script>

<template>
	<div class="docs-index">
		<div class="hero">
			<p class="eyebrow">BX Team Docs</p>
			<h1 class="heading">Documentation</h1>
			<p class="lede">Everything you need to get started with BX Team projects — server software, plugins, and libraries.</p>
		</div>

		<div class="section-label">Projects</div>
		<div class="projects-grid">
			<NuxtLink
				v-for="project in projects"
				:key="project.id"
				:to="`/docs/${project.id}`"
				class="project-card"
			>
				<div class="card-top">
					<div class="icon-wrap">
						<component :is="project.icon" :size="18" :stroke-width="1.7" />
					</div>
					<span class="tag">{{ project.tag }}</span>
				</div>
				<h2 class="card-title">{{ project.title }}</h2>
				<p class="card-desc">{{ project.description }}</p>
				<div class="card-cta">
					<span>Read docs</span>
					<ArrowRight :size="14" :stroke-width="1.8" />
				</div>
			</NuxtLink>
		</div>
	</div>
</template>

<style scoped>
.docs-index {
	max-width: 720px;
	margin: 0 auto;
}

.hero {
	margin-bottom: 48px;
}

.eyebrow {
	font: 600 11px var(--font-mono);
	letter-spacing: 0.08em;
	text-transform: uppercase;
	color: var(--brand);
	margin: 0 0 12px;
}

.heading {
	font: 700 36px/1.15 var(--font-sans);
	letter-spacing: -0.025em;
	color: var(--fg-hi);
	margin: 0 0 12px;
}

.lede {
	font: 400 16px/1.55 var(--font-sans);
	color: var(--dim);
	margin: 0;
	text-wrap: pretty;
}

.section-label {
	font: 600 11px var(--font-mono);
	letter-spacing: 0.08em;
	text-transform: uppercase;
	color: var(--mute);
	margin-bottom: 16px;
}

.projects-grid {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 12px;
}

.project-card {
	display: flex;
	flex-direction: column;
	padding: 20px;
	background: var(--bg-1);
	border: 1px solid var(--line);
	border-radius: 12px;
	text-decoration: none;
	color: inherit;
	transition: border-color 0.15s, background 0.15s;
	gap: 10px;
}
.project-card:hover {
	border-color: var(--line-2);
	background: var(--bg-2);
}

.card-top {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.icon-wrap {
	display: inline-grid;
	place-items: center;
	width: 34px;
	height: 34px;
	border-radius: 8px;
	background: color-mix(in oklab, var(--brand-soft) 80%, transparent);
	border: 1px solid color-mix(in oklab, var(--brand) 25%, var(--line));
	color: var(--brand);
}

.tag {
	font: 500 11px var(--font-mono);
	color: var(--mute);
	background: var(--bg-2);
	border: 1px solid var(--line);
	padding: 2px 8px;
	border-radius: 4px;
	letter-spacing: 0.04em;
}

.card-title {
	font: 700 17px/1.2 var(--font-sans);
	letter-spacing: -0.01em;
	color: var(--fg-hi);
	margin: 0;
}

.card-desc {
	font: 400 13px/1.55 var(--font-sans);
	color: var(--dim);
	margin: 0;
	flex: 1;
}

.card-cta {
	display: flex;
	align-items: center;
	gap: 6px;
	font: 500 12.5px var(--font-sans);
	color: var(--brand);
	margin-top: 4px;
}

@media (max-width: 640px) {
	.projects-grid {
		grid-template-columns: 1fr;
	}
	.heading {
		font-size: 28px;
	}
}
</style>
