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
import { DISCORD_URL } from '~/config/links'

const { data: session } = await useSession()
const loggedIn = computed(() => !!session.value?.user)

useHead({
	title: 'BX Team',
	titleTemplate: null,
})

const heroWords = ['Observability', 'Performance', 'Server plugins', 'Runtime deps']
const heroWordIdx = ref(0)
const heroWord = computed(() => heroWords[heroWordIdx.value])

let wordTimer: ReturnType<typeof setInterval>
onMounted(() => {
	wordTimer = setInterval(() => {
		heroWordIdx.value = (heroWordIdx.value + 1) % heroWords.length
	}, 4500)
})
onUnmounted(() => clearInterval(wordTimer))

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
		body: 'Ingest is fire-and-forget. The gateway validates auth, drops the batch onto the queue, returns immediately.',
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
		<Navbar :discord-href="DISCORD_URL" :logged-in="loggedIn" />

		<!-- Hero -->
		<Hero
			kicker="Pulsify · Open Beta"
			lede="BX Team is an open source community building tools and software that empower Minecraft server owners, developers, and players."
			no-atmosphere
		>
			<template #title>
				<span class="hero-word-wrap">
					<Transition name="word" mode="out-in">
						<span :key="heroWord" class="bx-text-grad">{{ heroWord }}</span>
					</Transition>
				</span>
				for Minecraft.
			</template>
			<template #cta>
				<Button variant="primary" href="/docs" @click="umTrackEvent('cta_click', { action: 'explore_docs' })">Explore docs</Button>
				<Button variant="secondary" href="/dashboard" @click="umTrackEvent('cta_click', { action: 'try_pulsify' })">Try Pulsify</Button>
			</template>
		</Hero>

		<!-- Interactive preview window -->
		<AppHeroPreview />

		<!-- Feature grid -->
		<FeatureGrid
			eyebrow="What is Pulsify?"
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
		<Footer :discord-href="DISCORD_URL" />
	</div>
</template>

<style scoped>
.hero-word-wrap {
	display: inline-block;
	position: relative;
}

.word-enter-active,
.word-leave-active {
	transition: opacity 0.35s ease, transform 0.35s ease;
}
.word-enter-from {
	opacity: 0;
	transform: translateY(10px);
}
.word-leave-to {
	opacity: 0;
	transform: translateY(-10px);
}

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
