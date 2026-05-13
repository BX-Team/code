<script setup lang="ts">
import { Button, FeatureCard, FeatureGrid, Footer, Hero, Navbar, ProjectCard, ProjectsGrid } from '@bx-team/ui';
import { Activity, AlertCircle, Box, Database, Users, Zap } from '@lucide/vue';
import { DISCORD_URL, GITHUB_URL } from '~/config/links';

const appConfig = useAppConfig();
const bxStatus = useStatusSummary();
const footerStatusLevel = computed((): 'ok' | 'warn' | 'err' => {
  if (bxStatus.value === 'degraded') return 'err';
  if (bxStatus.value === 'maintenance') return 'warn';
  return 'ok';
});
const footerStatusText = computed(() => {
  if (bxStatus.value === 'degraded') return 'Some systems degraded';
  if (bxStatus.value === 'maintenance') return 'Maintenance in progress';
  return 'All systems operational';
});

const { data: session } = await useSession();
const loggedIn = computed(() => !!session.value?.user);

useHead({
  title: 'BX Team',
  titleTemplate: null,
});

const heroWords = ['Observability', 'Performance', 'Server plugins', 'Runtime deps'];
const heroWordIdx = ref(0);
const heroWord = computed(() => heroWords[heroWordIdx.value]);

let wordTimer: ReturnType<typeof setInterval>;
onMounted(() => {
  wordTimer = setInterval(() => {
    heroWordIdx.value = (heroWordIdx.value + 1) % heroWords.length;
  }, 4500);
});
onUnmounted(() => clearInterval(wordTimer));

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
];

const projects = [
  {
    name: 'DivineMC',
    description:
      'Multi-functional fork of Purpur, which focuses on the flexibility of your server and its optimization',
    tag: 'Server software',
    archived: false,
    gameVersions: '1.19.2 – 1.21.11',
    href: 'https://github.com/BX-Team/DivineMC',
  },
  {
    name: 'Quark',
    description: 'Lightweight, runtime dependency management system for plugins running on Minecraft server platforms',
    tag: 'Library',
    archived: false,
    href: 'https://github.com/BX-Team/Quark',
  },
  {
    name: 'NDailyRewards',
    description:
      'Simple and lightweight plugin that allows you to reward your players for playing on your server every day',
    tag: 'Plugin',
    archived: false,
    href: 'https://github.com/BX-Team/NDailyRewards',
  },
  {
    name: 'Nyx',
    description: 'Modern, lightweight desktop GUI for the Mihomo proxy core',
    tag: 'Desktop app',
    archived: false,
    href: 'https://github.com/BX-Team/Nyx',
  },
  {
    name: 'run-server-plugin',
    description: 'Gradle plugin for running Minecraft server instances in your IDE',
    tag: 'Gradle plugin',
    archived: false,
    href: 'https://github.com/BX-Team/run-server-plugin',
  },
  {
    name: 'RealWorldSync',
    description: 'Synchronizes time and weather from the real world to the game',
    tag: 'Plugin',
    archived: true,
    href: 'https://github.com/BX-Team/RealWorldSync',
  },
];

const githubRepos = projects
  .filter(p => p.href.startsWith('https://github.com/'))
  .map(p => p.href.replace('https://github.com/', ''));

const { data: githubVersions } = await useAsyncData('github-versions', async () => {
  if (import.meta.client) return {} as Record<string, string | null>;
  const token = process.env.GITHUB_TOKEN;
  const results = await Promise.allSettled(
    githubRepos.map(async repo => {
      const res = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          Accept: 'application/vnd.github.v3+json',
        },
      });
      if (!res.ok) return [repo, null] as const;
      const data = await res.json();
      return [repo, (data.tag_name as string) ?? null] as const;
    }),
  );
  return Object.fromEntries(
    results
      .filter((r): r is PromiseFulfilledResult<readonly [string, string | null]> => r.status === 'fulfilled')
      .map(r => r.value),
  ) as Record<string, string | null>;
});

function projectVersion(href: string): string | undefined {
  const repo = href.replace('https://github.com/', '');
  return githubVersions.value?.[repo] ?? undefined;
}
</script>

<template>
	<div class="lp">
		<!-- Atmospheric glow — covers navbar + hero area -->
		<div class="lp-atmosphere" aria-hidden="true" />

		<!-- Floating pill navbar -->
		<Navbar :discord-href="DISCORD_URL" :logged-in="loggedIn" />

		<!-- Hero -->
		<Hero
			kicker="Pulsify · Open Beta starting soon"
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
				<!-- <Button variant="secondary" href="/dashboard" @click="umTrackEvent('cta_click', { action: 'try_pulsify' })">Try Pulsify</Button> -->
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
				:version="projectVersion(p.href)"
				:archived="p.archived"
				:game-versions="p.gameVersions"
				:href="p.href"
			/>
		</ProjectsGrid>

		<!-- Footer -->
		<Footer
			:github-href="GITHUB_URL"
			:discord-href="DISCORD_URL"
			:status="footerStatusText"
			:status-level="footerStatusLevel"
			status-href="https://status.bxteam.org"
		/>
	</div>
</template>

<style scoped>
.hero-word-wrap {
	display: inline-block;
	position: relative;
}

@media (max-width: 640px) {
	.hero-word-wrap {
		display: block;
	}
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
