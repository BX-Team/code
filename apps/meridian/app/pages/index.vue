<script setup lang="ts">
import {
	Navbar,
	Hero,
	Button,
	Footer,
	FeatureCard,
	FeatureGrid,
	ProjectCard,
	ProjectsGrid,
} from '@bx-team/ui'
import { Activity, Users, AlertCircle, Box, Database, Zap } from '@lucide/vue'

useHead({
	title: 'Pulsify — Observability for Minecraft · BX Team',
})

const features = [
	{
		icon: Activity,
		title: 'Heartbeats',
		body: 'TPS, MSPT, memory, version, software — pushed every five minutes from the SDK.',
	},
	{
		icon: Users,
		title: 'Player events',
		body: 'Joins, quits, sessions, geography. IPs hash on the SDK side and never leave the server.',
	},
	{
		icon: AlertCircle,
		title: 'Error tracker',
		body: 'Stacktraces grouped by hash. First / last seen, count, level — a Sentry-shaped view for plugins.',
	},
	{
		icon: Database,
		title: 'Custom metrics',
		body: 'Numeric values with labels, written straight into ClickHouse. Chart anything you can name.',
	},
	{
		icon: Box,
		title: 'Multi-token DSN',
		body: 'Issue, label, and revoke ingest tokens per environment. No shared API keys.',
	},
	{
		icon: Zap,
		title: '202 Accepted, always',
		body: 'Ingest is fire-and-forget. Hono validates auth, drops the batch onto BullMQ, returns immediately.',
	},
]

const projects = [
	{ name: 'DivineMC',       description: 'Multi-functional Purpur fork',         tag: 'Server',   version: 'v1.21.1', href: 'https://github.com/BX-Team/DivineMC' },
	{ name: 'Pulsify',        description: 'Observability for Minecraft',           tag: 'Platform', version: 'v0.1.0',  href: 'https://github.com/BX-Team/Pulsify' },
	{ name: 'Quark',          description: 'Runtime dependency manager',            tag: 'Library',  version: 'v0.3.0',  href: 'https://github.com/BX-Team/Quark' },
	{ name: 'NDailyRewards',  description: 'Daily reward plugin',                   tag: 'Plugin',   version: 'v1.4.0',  href: 'https://github.com/BX-Team/NDailyRewards' },
	{ name: 'Helix',          description: 'BX Team plugin library',                tag: 'Library',  version: 'v0.2.0',  href: 'https://github.com/BX-Team/Helix' },
	{ name: 'RealWorldSync',  description: 'Real-world time + weather sync',        tag: 'Plugin',   version: 'v1.0.0',  href: 'https://github.com/BX-Team/RealWorldSync' },
]
</script>

<template>
	<div class="lp">
		<!-- Atmospheric glow — covers navbar + hero area -->
		<div class="lp-atmosphere" aria-hidden="true" />

		<!-- Floating pill navbar -->
		<Navbar />

		<!-- Hero -->
		<Hero
			kicker="Now in early access"
			lede="Heartbeats, players, errors, custom metrics — all in one place. Drop in the Java SDK, expose a DSN, and the dashboard fills in."
			no-atmosphere
		>
			<template #title>
				<span class="bx-text-grad">Observability</span> for Minecraft.
			</template>
			<template #cta>
				<Button variant="primary" href="/docs">Get started</Button>
				<Button variant="secondary" href="/pulsify">Read the docs</Button>
			</template>
		</Hero>

		<!-- Interactive preview window -->
		<AppHeroPreview />

		<!-- Feature grid -->
		<FeatureGrid
			eyebrow="What ships in v1"
			heading="Observability built for the game loop."
			lede="Pulsify sits between your server and a low-latency ingest pipeline. Drop in the Java SDK, expose a DSN, and the dashboard fills in."
		>
			<FeatureCard
				v-for="f in features"
				:key="f.title"
				:title="f.title"
				:body="f.body"
			>
				<template #icon>
					<component :is="f.icon" :size="16" :stroke-width="1.6" />
				</template>
			</FeatureCard>
		</FeatureGrid>

		<!-- Code showcase -->
		<AppCodeShowcase />

		<!-- Projects grid -->
		<ProjectsGrid
			eyebrow="Open source"
			heading="Everything we ship lives on GitHub."
		>
			<ProjectCard
				v-for="p in projects"
				:key="p.name"
				:name="p.name"
				:description="p.description"
				:tag="p.tag"
				:version="p.version"
				:href="p.href"
			/>
		</ProjectsGrid>

		<!-- Footer -->
		<Footer />
	</div>
</template>

<style scoped>
.lp {
	position: relative;
	min-height: 100vh;
	overflow-x: hidden;
}

/* Atmospheric glow behind navbar + hero */
.lp-atmosphere {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	height: 960px;
	pointer-events: none;
	overflow: hidden;
	z-index: 0;
}

.lp-atmosphere::before {
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

.lp-atmosphere::after {
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
</style>
