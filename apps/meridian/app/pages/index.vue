<script setup lang="ts">
import { Button, FeatureCard, FeatureGrid, Footer, Hero, ProjectCard, ProjectsGrid } from '@bx-team/ui';
import { BookOpen, Box, Download, Package, Users, Zap } from '@lucide/vue';
import { openCommandPalette } from '@/composables/useCommandPalette';
import { DISCORD_URL, GITHUB_URL } from '~/config/links';

useHead({
  title: 'BX Team',
  titleTemplate: null,
});

const heroWords = ['Server software', 'Performance', 'Server plugins', 'Runtime deps'];
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
    icon: Zap,
    title: 'Server software',
    body: 'DivineMC is a Purpur fork built around flexibility and raw throughput, tracked against every Minecraft release.',
  },
  {
    icon: Package,
    title: 'Runtime dependencies',
    body: 'Quark resolves and loads plugin dependencies at runtime, so shading a library into every jar stops being the answer.',
  },
  {
    icon: Users,
    title: 'Plugins that ship',
    body: 'Small, focused plugins like NDailyRewards — maintained, documented, and used on real servers.',
  },
  {
    icon: Download,
    title: 'Versioned downloads',
    body: 'Every build is published through the Atlas API with its channel, commit log, size and SHA-256 checksum.',
  },
  {
    icon: BookOpen,
    title: 'Documentation',
    body: 'Getting started, configuration references and guides for each project, searchable from anywhere with ⌘K.',
  },
  {
    icon: Box,
    title: 'Open source',
    body: 'Everything we build is developed in the open on GitHub — issues, pull requests and releases included.',
  },
];

const projects = [
  {
    name: 'DivineMC',
    description:
      'Multi-functional fork of Purpur, which focuses on the flexibility of your server and its optimization',
    tag: 'Server software',
    archived: false,
    gameVersions: '1.20 – 26.2',
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
    name: 'run-server-plugin',
    description: 'Gradle plugin for running Minecraft server instances in your IDE',
    tag: 'Gradle plugin',
    archived: false,
    href: 'https://github.com/BX-Team/run-server-plugin',
  },
  {
    name: 'Nyx',
    description: 'Modern, lightweight desktop GUI for the Mihomo proxy core',
    tag: 'Desktop app',
    archived: false,
    href: 'https://github.com/BX-Team/Nyx',
  },
  {
    name: 'Nexon',
    description: 'Multi-protocol VPN control-plane for Xray nodes - CLI + TUI, no web panel',
    tag: 'VPN Manager',
    archived: false,
    href: 'https://github.com/BX-Team/Nexon',
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
		<!-- Atmospheric glow — covers the bar + hero area -->
		<div class="lp-atmosphere" aria-hidden="true" />

		<SiteNav search-enabled @search="openCommandPalette()" />

		<!-- Hero -->
		<Hero
			kicker=""
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
				<Button variant="primary" href="/docs">Explore docs</Button>
				<Button variant="secondary" href="/downloads">Downloads</Button>
			</template>
		</Hero>

		<!-- Feature grid -->
		<FeatureGrid
			eyebrow="What we build"
			heading="Tools for the people who run the servers."
			lede="Server software, libraries and plugins, each with its own documentation and a downloads API that never hands you an unchecksummed jar."
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

		<Footer
			:github-href="GITHUB_URL"
			:discord-href="DISCORD_URL"
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
	/* `clip`, not `hidden`: `hidden` makes this a scroll container and the sticky bar
	   would scroll away with the page. */
	overflow-x: clip;
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
