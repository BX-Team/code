<script setup lang="ts">
import { Button, FeatureCard, PageHero, Section } from '@bx-team/ui';
import { ArrowUpRight, BookOpen, Check, Copy, Download } from '@lucide/vue';
import { useClipboard } from '@vueuse/core';
import type { ThemedToken } from 'shiki/core';
import { openCommandPalette } from '@/composables/useCommandPalette';
import githubSvgRaw from '~/assets/external/github.svg?raw';
import BenchChart from '~/components/content/BenchChart.vue';
import { BENCHMARKS } from '~/config/benchmarks';
import { findProject } from '~/config/projects';
import { tokenize } from '~/lib/highlight';

const route = useRoute();
const project = findProject(String(route.params.project));
if (!project) {
  throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true });
}

const link = resolveComponent('NuxtLink');
const githubUrl = `https://github.com/${project.repo}`;

const bands = [
  project.previews.length ? 'previews' : null,
  'features',
  project.benchmarks ? 'benchmarks' : null,
  'start',
].filter(Boolean);
const alt = (band: string) => bands.indexOf(band) % 2 === 1;

const botswarm = (profile: string) => BENCHMARKS.botswarm.find(r => r.build === 'divinemc' && r.profile === profile);
const paperSwarm = BENCHMARKS.botswarm.find(r => r.build === 'paper');
const rct4 = BENCHMARKS.rctclusters[4][0];
const genMax = BENCHMARKS.chunkgen.find(r => r.build === 'divinemc' && r.profile === 'max');
const genPaper = BENCHMARKS.chunkgen.find(r => r.build === 'paper');
const benchHighlights = [
  {
    value: `${Math.round(botswarm('rct')?.p50VsPaper ?? 0)}%`,
    label: 'lower tick time than Paper with 150 players and 1,500 mobs',
    detail: `${botswarm('rct')?.p50.toFixed(1)} ms against ${paperSwarm?.p50.toFixed(1)} ms, regionized chunk ticking`,
  },
  {
    value: `${Math.round(rct4?.p50VsPaper ?? 0)}%`,
    label: 'lower tick time than Paper across eight busy regions',
    detail: `${rct4?.p50.toFixed(1)} ms against ${BENCHMARKS.rctclusters[4][1]?.p50.toFixed(1)} ms, four RCT threads`,
  },
  {
    value: `${Math.round(genMax?.vsPaper ?? 0)}%`,
    label: `faster chunk pregeneration, on ${Math.round(-(genMax?.cpuVsPaper ?? 0))}% less CPU`,
    detail: `${genMax?.seconds.toFixed(0)} s against ${genPaper?.seconds.toFixed(0)} s for 66,049 chunks, max profile`,
  },
];

const { copy, copied, text: copiedText } = useClipboard({ legacy: true });

const storeButtons = !project.downloads && !!project.channels?.length;

const coloured = shallowRef<Record<string, ThemedToken[][]>>({});
onMounted(async () => {
  const entries = await Promise.all(
    project.start.filter(s => s.code && s.lang).map(async s => [s.title, await tokenize(s.code!, s.lang!)] as const),
  );
  coloured.value = Object.fromEntries(entries);
});

useHead({
  title: project.name,
  meta: [{ name: 'description', content: project.summary }],
});
</script>

<template>
	<div v-if="project" class="proj">
		<SiteNav overlay search-enabled @search="openCommandPalette()" />

		<main>
			<PageHero :title="project.name" :tagline="project.tagline" :lede="project.lede">
				<template #crumbs>
					<NuxtLink to="/#projects">Projects</NuxtLink>
					<span aria-hidden="true">/</span>
					<span aria-current="page">{{ project.name }}</span>
				</template>
				<template #badge>
					<span v-if="project.archived" class="proj-chip">Archived</span>
					<span v-else class="proj-tag">{{ project.tag }}</span>
				</template>
				<template #cta>
					<Button v-if="project.downloads" variant="primary" :href="project.downloads">
						<Download :size="16" :stroke-width="1.7" />
						Download
					</Button>
					<Button v-if="project.docs" :variant="project.downloads ? 'secondary' : 'primary'" :href="project.docs">
						<BookOpen :size="16" :stroke-width="1.7" />
						Documentation
					</Button>
					<template v-if="storeButtons">
						<Button v-for="c in project.channels" :key="c.href" variant="secondary" :href="c.href" target="_blank" rel="noopener">
							{{ c.label }}
							<ArrowUpRight :size="15" :stroke-width="1.7" />
						</Button>
					</template>
					<Button :variant="project.downloads || project.docs ? 'ghost' : 'primary'" :href="githubUrl" target="_blank" rel="noopener">
						<span class="proj-gh" v-html="githubSvgRaw" />
						GitHub
					</Button>
				</template>
				<template v-if="project.channels?.length && !storeButtons" #meta>
					Also on
					<template v-for="(c, i) in project.channels" :key="c.href">
						<a class="bx-link" :href="c.href" target="_blank" rel="noopener">{{ c.label }}</a><span v-if="i < project.channels.length - 1">, </span>
					</template>
				</template>
			</PageHero>

			<div v-if="project.archived" class="proj-archived">
				<p class="proj-callout proj-callout--warn">
					<span class="proj-callout__mark">Archived</span>
					<span>
						{{ project.name }} is archived on GitHub and no longer maintained. The code and releases stay available,
						but it gets no fixes or updates.
					</span>
				</p>
			</div>

			<Section v-if="project.previews.length" title="Preview" :alt="alt('previews')">
				<div class="proj-previews" :class="{ 'proj-previews--single': project.previews.length === 1 }">
					<figure v-for="p in project.previews" :key="p.src" class="proj-preview">
						<div class="proj-preview__frame">
							<img :src="p.src" :alt="p.alt" loading="lazy" decoding="async" />
						</div>
						<figcaption v-if="p.caption" class="bx-caption">{{ p.caption }}</figcaption>
					</figure>
				</div>
			</Section>

			<Section title="Features" :lede="`What ${project.name} does, and where to read more about each part.`" :alt="alt('features')">
				<template v-if="project.docs" #action>
					<NuxtLink class="bx-link proj-more" :to="project.docs">Read the docs →</NuxtLink>
				</template>
				<div class="proj-grid">
					<FeatureCard
						v-for="f in project.features"
						:key="f.title"
						:title="f.title"
						:body="f.body"
						:href="f.href"
						:link-as="link"
					>
						<template #icon>
							<component :is="f.icon" :size="18" :stroke-width="1.6" />
						</template>
					</FeatureCard>
				</div>
			</Section>

			<Section
				v-if="project.benchmarks === 'pending'"
				title="Paper vs DivineMC"
				lede="The same worlds, the same plugins and the same hardware, run on both servers and measured side by side."
				:alt="alt('benchmarks')"
			>
				<p class="proj-callout proj-callout--note">
					<span class="proj-callout__mark">In progress</span>
					<span>
						The benchmark runs are still going. Results — tick times, TPS and memory under load — will be published here
						once they are complete.
					</span>
				</p>
			</Section>

			<Section
				v-else-if="project.benchmarks"
				title="Benchmarks"
				:lede="`${project.name} against Paper and Purpur: the same worlds, the same bots and the same machine, five runs each.`"
				:alt="alt('benchmarks')"
			>
				<template #action>
					<NuxtLink class="bx-link proj-more" :to="project.benchmarks.docs">Full results →</NuxtLink>
				</template>
				<div class="proj-bench">
					<div v-for="h in benchHighlights" :key="h.label" class="proj-bench__stat">
						<p class="proj-bench__value">{{ h.value }}</p>
						<p class="proj-bench__label">{{ h.label }}</p>
						<p class="bx-caption">{{ h.detail }}</p>
					</div>
				</div>
				<p class="bx-micro proj-bench__title">Tick time, 150 players and 1,500 mobs</p>
				<BenchChart scenario="botswarm" hide-parity />
				<p class="bx-caption proj-bench__note">
					{{ BENCHMARKS.cpu }}, Minecraft {{ BENCHMARKS.minecraft }}, median of five runs. The speed comes from
					spreading work across cores: DivineMC uses 1.6–1.8 cores here against Paper’s 1.4. Hover or tap a bar for
					p99, CPU and run spread.
				</p>
			</Section>

			<Section title="Get started" :alt="alt('start')">
				<div class="proj-start" :class="{ 'proj-start--single': project.start.length === 1 }">
					<article v-for="s in project.start" :key="s.title" class="proj-card">
						<p class="bx-micro">{{ s.label }}</p>
						<h3 class="proj-card__title">{{ s.title }}</h3>
						<p class="proj-card__body">{{ s.body }}</p>
						<div v-if="s.code" class="proj-code">
							<pre v-if="coloured[s.title]"><code><template v-for="(line, i) in coloured[s.title]" :key="i"><span
								v-for="(token, at) in line" :key="at" :style="{ color: token.color }">{{ token.content }}</span><template v-if="i < coloured[s.title]!.length - 1">{{ '\n' }}</template></template></code></pre>
							<pre v-else><code>{{ s.code }}</code></pre>
							<button
								type="button"
								class="proj-code__copy"
								:aria-label="copied && copiedText === s.code ? 'Copied' : 'Copy to clipboard'"
								@click="copy(s.code)"
							>
								<Check v-if="copied && copiedText === s.code" :size="15" :stroke-width="1.7" />
								<Copy v-else :size="15" :stroke-width="1.7" />
							</button>
						</div>
						<div v-if="s.action" class="proj-card__foot">
							<Button
								variant="primary"
								:href="s.action.href"
								:target="s.action.href.startsWith('http') ? '_blank' : undefined"
								:rel="s.action.href.startsWith('http') ? 'noopener' : undefined"
							>
								{{ s.action.label }}
								<ArrowUpRight v-if="s.action.href.startsWith('http')" :size="15" :stroke-width="1.7" />
							</Button>
						</div>
					</article>
				</div>
			</Section>
		</main>

		<SiteFooter />
	</div>
</template>

<style scoped>
.proj {
	min-height: 100vh;
	overflow-x: clip;
}

.proj-tag,
.proj-chip {
	font: 500 11px/1 var(--font-mono);
	padding: 5px 8px;
	border-radius: var(--r-1);
}

.proj-tag {
	background: var(--accent-wash);
	color: var(--accent-2);
}

.proj-chip {
	border: 1px solid var(--line-2);
	background: var(--surface-1);
	color: var(--warn);
	letter-spacing: 0.08em;
	text-transform: uppercase;
}

.proj-gh {
	display: inline-flex;
	line-height: 0;
}

.proj-gh :deep(svg) {
	width: 16px;
	height: 16px;
}

.proj-archived {
	max-width: var(--container);
	margin: 0 auto;
	padding: var(--s-8) var(--s-8) 0;
}

.proj-callout {
	display: flex;
	gap: var(--s-3);
	margin: 0;
	padding: var(--s-4);
	border: 1px solid var(--line);
	border-left: 2px solid var(--rule);
	border-radius: var(--r-1);
	background: var(--surface-0);
	font: 400 13.5px/1.6 var(--font-mono);
	color: var(--dim);
}

.proj-callout__mark {
	flex: none;
	padding-top: 2px;
	font: 500 11px/1.4 var(--font-mono);
	letter-spacing: 0.1em;
	text-transform: uppercase;
}

.proj-callout--note {
	border-left-color: var(--info);
}

.proj-callout--note .proj-callout__mark {
	color: var(--info);
}

.proj-callout--warn {
	border-left-color: var(--warn);
}

.proj-callout--warn .proj-callout__mark {
	color: var(--warn);
}

.proj-bench {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: var(--s-6);
	margin-bottom: var(--s-12);
}

.proj-bench__stat {
	display: flex;
	flex-direction: column;
	gap: var(--s-2);
	padding-left: var(--s-4);
	border-left: 2px solid var(--accent);
}

.proj-bench__stat p {
	margin: 0;
}

.proj-bench__value {
	font: 600 48px/1 var(--font-sans);
	letter-spacing: -0.03em;
	color: var(--fg-hi);
}

.proj-bench__label {
	font: 400 14px/1.5 var(--font-mono);
	color: var(--fg);
}

.proj-bench__title {
	margin: 0 0 calc(-1 * var(--s-3));
}

.proj-bench__note {
	max-width: 52rem;
	margin: 0;
}

.proj-more {
	font-size: 13.5px;
	white-space: nowrap;
}

.proj-previews {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: var(--s-6);
}

.proj-previews--single {
	grid-template-columns: minmax(0, 60rem);
	justify-content: center;
}

.proj-preview {
	display: flex;
	flex-direction: column;
	gap: var(--s-3);
	margin: 0;
}

.proj-preview__frame {
	overflow: hidden;
	border: 1px solid var(--line-2);
	border-radius: var(--r-4);
	background: var(--surface-deep);
}

.proj-preview__frame img {
	display: block;
	width: 100%;
	height: auto;
}

.proj-grid {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: var(--s-6);
}

.proj-start {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: var(--s-6);
}

.proj-start--single {
	grid-template-columns: minmax(0, 1fr);
}

.proj-card {
	display: flex;
	flex-direction: column;
	gap: var(--s-3);
	min-width: 0;
	padding: var(--s-6);
	background: var(--surface-card);
	border: 1px solid var(--line);
	border-radius: var(--r-1);
}

.proj-card__title {
	margin: 0;
	font: 600 21px/1.3 var(--font-sans);
	letter-spacing: -0.01em;
	color: var(--fg);
}

.proj-card__body {
	margin: 0;
	font: 400 13.5px/1.6 var(--font-mono);
	color: var(--dim);
}

.proj-card__foot {
	margin-top: auto;
	padding-top: var(--s-3);
}

.proj-code {
	position: relative;
	margin-top: var(--s-1);
}

.proj-code pre {
	margin: 0;
	padding: var(--s-4) var(--s-12) var(--s-4) var(--s-4);
	overflow-x: auto;
	white-space: pre-wrap;
	overflow-wrap: anywhere;
	background: var(--surface-deep);
	border: 1px solid var(--line);
	border-radius: var(--r-3);
	font: 400 13px/1.55 var(--font-mono);
	color: var(--fg);
}

.proj-code__copy {
	position: absolute;
	top: 6px;
	right: 6px;
	display: grid;
	place-items: center;
	width: 32px;
	height: 32px;
	border: 0;
	border-radius: var(--r-1);
	background: transparent;
	color: var(--mute);
	cursor: pointer;
	transition:
		color 0.15s ease,
		background-color 0.15s ease;
}

.proj-code__copy:hover {
	color: var(--fg-hi);
	background: var(--surface-2);
}

@media (max-width: 1023px) {
	.proj-grid {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
}

@media (max-width: 860px) {
	.proj-archived {
		padding: var(--s-6) var(--s-4) 0;
	}

	.proj-previews,
	.proj-start,
	.proj-bench,
	.proj-grid {
		grid-template-columns: 1fr;
	}
}
</style>
