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
const { t, locale } = useI18n();
const sitePath = useSitePath();
const text = (key: string) => t(`projects.${project.slug}.${key}`);
const githubUrl = `https://github.com/${project.repo}`;

const botswarm = (profile: string) => BENCHMARKS.botswarm.find(r => r.build === 'divinemc' && r.profile === profile);
const paperSwarm = BENCHMARKS.botswarm.find(r => r.build === 'paper');
const rct4 = BENCHMARKS.rctclusters[4][0];
const genMax = BENCHMARKS.chunkgen.find(r => r.build === 'divinemc' && r.profile === 'max');
const genPaper = BENCHMARKS.chunkgen.find(r => r.build === 'paper');
const benchHighlights = computed(() => [
  {
    id: 'swarm',
    value: `${Math.round(botswarm('rct')?.p50VsPaper ?? 0)}%`,
    label: t('project.bench.swarm.label'),
    detail: t('project.bench.swarm.detail', {
      ours: botswarm('rct')?.p50.toFixed(1),
      paper: paperSwarm?.p50.toFixed(1),
    }),
  },
  {
    id: 'regions',
    value: `${Math.round(rct4?.p50VsPaper ?? 0)}%`,
    label: t('project.bench.regions.label'),
    detail: t('project.bench.regions.detail', {
      ours: rct4?.p50.toFixed(1),
      paper: BENCHMARKS.rctclusters[4][1]?.p50.toFixed(1),
    }),
  },
  {
    id: 'pregen',
    value: `${Math.round(genMax?.vsPaper ?? 0)}%`,
    label: t('project.bench.pregen.label', { cpu: Math.round(-(genMax?.cpuVsPaper ?? 0)) }),
    detail: t('project.bench.pregen.detail', {
      ours: genMax?.seconds.toFixed(0),
      paper: genPaper?.seconds.toFixed(0),
      chunks: (66049).toLocaleString(locale.value),
    }),
  },
]);

const previews = computed(() =>
  project.previews.map(p => ({
    src: p.src,
    alt: text(`previews.${p.id}.alt`),
    caption: p.caption ? text(`previews.${p.id}.caption`) : undefined,
  })),
);

const zoomed = ref<number | null>(null);

const { copy, copied, text: copiedText } = useClipboard({ legacy: true });

const storeButtons = !project.downloads && !!project.channels?.length;

const startIndex = ref(0);
const start = computed(() => project.start[startIndex.value] ?? project.start[0]!);

const coloured = shallowRef<Record<string, ThemedToken[][]>>({});
onMounted(async () => {
  const entries = await Promise.all(
    project.start.filter(s => s.code && s.lang).map(async s => [s.id, await tokenize(s.code!, s.lang!)] as const),
  );
  coloured.value = Object.fromEntries(entries);
});

useHead({
  title: project.name,
  meta: [{ name: 'description', content: () => text('summary') }],
});
</script>

<template>
	<div v-if="project" class="proj">
		<SiteNav search-enabled @search="openCommandPalette()" />

		<main>
			<PageHero :title="project.name" :tagline="text('tagline')" :lede="text('lede')">
				<template #crumbs>
					<NuxtLink :to="sitePath('/#projects')">{{ t('project.projects') }}</NuxtLink>
					<span aria-hidden="true">/</span>
					<span aria-current="page">{{ project.name }}</span>
				</template>
				<template #badge>
					<span v-if="project.archived" class="proj-chip">{{ t('project.archived') }}</span>
					<span v-else class="proj-tag">{{ text('tag') }}</span>
				</template>
				<template #cta>
					<Button v-if="project.downloads" variant="primary" :href="sitePath(project.downloads)">
						<Download :size="16" :stroke-width="1.7" />
						{{ t('project.download') }}
					</Button>
					<Button v-if="project.docs" :variant="project.downloads ? 'secondary' : 'primary'" :href="project.docs">
						<BookOpen :size="16" :stroke-width="1.7" />
						{{ t('project.docs') }}
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
					{{ t('project.alsoOn') }}
					<template v-for="(c, i) in project.channels" :key="c.href">
						<a class="bx-link" :href="c.href" target="_blank" rel="noopener">{{ c.label }}</a><span v-if="i < project.channels.length - 1">, </span>
					</template>
				</template>
			</PageHero>

			<div v-if="project.archived" class="proj-archived">
				<p class="proj-callout proj-callout--warn">
					<span class="proj-callout__mark">{{ t('project.archived') }}</span>
					<span>{{ t('project.archivedBody', { name: project.name }) }}</span>
				</p>
			</div>

			<Section
				v-if="project.demo"
				class="proj-demo"
				:title="t('project.demo')"
				:lede="t('project.demoLede', { name: project.demo.title })"
			>
				<ProjectDemo :demo="project.demo" :logo="project.logo" />
			</Section>

			<Section v-if="previews.length" :title="t('project.preview')">
				<div class="proj-previews" :class="{ 'proj-previews--single': previews.length === 1 }">
					<figure v-for="(p, i) in previews" :key="p.src" class="proj-preview">
						<button class="proj-preview__frame" type="button" :aria-label="t('project.enlarge', { name: p.caption ?? p.alt })" @click="zoomed = i">
							<img :src="p.src" :alt="p.alt" loading="lazy" decoding="async" />
						</button>
						<figcaption v-if="p.caption" class="bx-caption">{{ p.caption }}</figcaption>
					</figure>
				</div>
				<PreviewLightbox v-model="zoomed" :previews="previews" />
			</Section>

			<Section :title="t('project.features')" :lede="t('project.featuresLede', { name: project.name })">
				<template v-if="project.docs" #action>
					<NuxtLink class="bx-link proj-more" :to="project.docs">{{ t('project.readDocs') }} →</NuxtLink>
				</template>
				<div class="proj-grid">
					<FeatureCard
						v-for="f in project.features"
						:key="f.id"
						:title="text(`features.${f.id}.title`)"
						:body="text(`features.${f.id}.body`)"
						:href="f.href && sitePath(f.href)"
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
				:lede="t('project.pending.lede')"
			>
				<p class="proj-callout proj-callout--note">
					<span class="proj-callout__mark">{{ t('project.pending.mark') }}</span>
					<span>{{ t('project.pending.body') }}</span>
				</p>
			</Section>

			<Section
				v-else-if="project.benchmarks"
				:title="t('project.bench.title')"
				:lede="t('project.bench.lede', { name: project.name })"
			>
				<template #action>
					<NuxtLink class="bx-link proj-more" :to="project.benchmarks.docs">{{ t('project.bench.full') }} →</NuxtLink>
				</template>
				<div class="proj-bench">
					<div v-for="h in benchHighlights" :key="h.id" class="proj-bench__stat">
						<p class="proj-bench__value bx-text-grad">{{ h.value }}</p>
						<p class="proj-bench__label">{{ h.label }}</p>
						<p class="bx-caption">{{ h.detail }}</p>
					</div>
				</div>
				<p class="bx-micro proj-bench__title">{{ t('project.bench.chart') }}</p>
				<BenchChart scenario="botswarm" hide-parity />
				<p class="bx-caption proj-bench__note">
					{{ t('project.bench.note', { cpu: BENCHMARKS.cpu, minecraft: BENCHMARKS.minecraft }) }}
				</p>
			</Section>

			<Section :title="t('project.start')">
				<div class="proj-start" :class="{ 'proj-start--single': project.start.length === 1 }">
					<div v-if="project.start.length > 1" class="proj-start__tabs" role="tablist" :aria-label="t('project.startWays')">
						<button
							v-for="(s, i) in project.start"
							:key="s.id"
							type="button"
							role="tab"
							class="proj-start__tab"
							:class="{ 'proj-start__tab--on': i === startIndex }"
							:aria-selected="i === startIndex"
							@click="startIndex = i"
						>
							<span class="proj-start__label">{{ text(`start.${s.id}.label`) }}</span>
							<span class="proj-start__name">{{ text(`start.${s.id}.title`) }}</span>
						</button>
					</div>

					<div class="proj-start__panel" role="tabpanel">
						<p v-if="project.start.length === 1" class="proj-start__label">{{ text(`start.${start.id}.label`) }}</p>
						<h3 class="proj-start__title">{{ text(`start.${start.id}.title`) }}</h3>
						<p class="proj-start__body">{{ text(`start.${start.id}.body`) }}</p>
						<div v-if="start.code" class="proj-code">
							<div class="proj-code__bar">
								<span class="proj-code__dots" aria-hidden="true"><i /><i /><i /></span>
								<span class="proj-code__file">{{ start.lang === 'kotlin' ? 'build.gradle.kts' : 'terminal' }}</span>
								<button
									type="button"
									class="proj-code__copy"
									:aria-label="copied && copiedText === start.code ? t('common.copied') : t('common.copy')"
									@click="copy(start.code)"
								>
									<Check v-if="copied && copiedText === start.code" :size="15" :stroke-width="1.7" />
									<Copy v-else :size="15" :stroke-width="1.7" />
								</button>
							</div>
							<pre v-if="coloured[start.id]"><code><template v-for="(line, i) in coloured[start.id]" :key="i"><span
								v-for="(token, at) in line" :key="at" :style="{ color: token.color }">{{ token.content }}</span><template v-if="i < coloured[start.id]!.length - 1">{{ '\n' }}</template></template></code></pre>
							<pre v-else><code>{{ start.code }}</code></pre>
						</div>
						<div v-if="start.href" class="proj-start__foot">
							<Button
								variant="primary"
								:href="sitePath(start.href)"
								:target="start.href.startsWith('http') ? '_blank' : undefined"
								:rel="start.href.startsWith('http') ? 'noopener' : undefined"
							>
								{{ text(`start.${start.id}.action`) }}
								<ArrowUpRight v-if="start.href.startsWith('http')" :size="15" :stroke-width="1.7" />
							</Button>
						</div>
					</div>
				</div>
			</Section>
		</main>

		<SiteFooter />
	</div>
</template>

<style scoped>
/* A desktop interface scaled to a phone is unreadable, and touch cannot drive it well. */
@media (max-width: 767px) {
	.proj-demo {
		display: none;
	}
}

.proj {
	min-height: 100vh;
	overflow-x: clip;
}

.proj > main {
	padding-bottom: var(--s-16);
}

.proj-tag,
.proj-chip {
	display: inline-flex;
	align-items: center;
	height: 24px;
	padding: 0 10px;
	border-radius: var(--r-pill);
	font: 500 12px/1 var(--font-sans);
}

.proj-tag {
	background: var(--accent-wash);
	color: var(--accent-2);
}

.proj-chip {
	background: var(--surface-3);
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
	padding: var(--s-6) var(--s-4) 0;
}

.proj-callout {
	display: flex;
	gap: var(--s-3);
	margin: 0;
	padding: var(--s-4);
	border: 1px solid var(--line);
	border-radius: var(--r-3);
	background: var(--surface-card);
	font: 400 14px/1.6 var(--font-sans);
	color: var(--dim);
}

.proj-callout__mark {
	flex: none;
	padding-top: 2px;
	font: 500 11px/1.4 var(--font-mono);
	letter-spacing: 0.1em;
	text-transform: uppercase;
}

.proj-callout--note .proj-callout__mark {
	color: var(--info);
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
	padding: var(--s-5) var(--s-6);
	border: 1px solid var(--line);
	border-radius: var(--r-4);
	background: var(--surface-card);
}

.proj-bench__stat p {
	margin: 0;
}

.proj-bench__value {
	font: 900 48px/1 var(--font-sans);
	letter-spacing: -0.05em;
}

.proj-bench__label {
	font: 400 14px/1.5 var(--font-sans);
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
	display: block;
	padding: 0;
	overflow: hidden;
	border: 1px solid var(--line-2);
	border-radius: var(--r-4);
	background: var(--surface-deep);
	cursor: zoom-in;
	transition: border-color 0.15s ease;
}

.proj-preview__frame:hover,
.proj-preview__frame:focus-visible {
	border-color: var(--rule);
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
	grid-template-columns: 280px minmax(0, 1fr);
	overflow: hidden;
	border: 1px solid var(--line);
	border-radius: var(--r-4);
	background: var(--surface-card);
}

.proj-start--single {
	grid-template-columns: minmax(0, 1fr);
}

.proj-start__tabs {
	display: flex;
	flex-direction: column;
	gap: 4px;
	padding: var(--s-3);
	border-right: 1px solid var(--line);
	background: var(--surface-1);
}

.proj-start__tab {
	display: flex;
	flex-direction: column;
	gap: 4px;
	padding: 12px 14px;
	border: 0;
	border-radius: var(--r-3);
	background: transparent;
	text-align: left;
	cursor: pointer;
	transition: background-color 0.15s ease;
}

.proj-start__tab:hover {
	background: var(--surface-2);
}

.proj-start__tab--on {
	background: var(--surface-3);
}

.proj-start__label {
	margin: 0;
	font: 500 11px/1.4 var(--font-mono);
	letter-spacing: 0.1em;
	text-transform: uppercase;
	color: var(--mute);
}

.proj-start__tab--on .proj-start__label {
	color: var(--accent-2);
}

.proj-start__name {
	font: 600 14px/1.35 var(--font-sans);
	color: var(--dim);
}

.proj-start__tab--on .proj-start__name {
	color: var(--fg);
}

.proj-start__panel {
	display: flex;
	flex-direction: column;
	gap: var(--s-3);
	min-width: 0;
	padding: var(--s-6);
}

.proj-start__title {
	margin: 0;
	font: 700 22px/1.25 var(--font-sans);
	letter-spacing: -0.03em;
	color: var(--fg);
}

.proj-start__body {
	max-width: 60ch;
	margin: 0;
	font: 400 14px/1.6 var(--font-sans);
	color: var(--dim);
}

.proj-start__foot {
	padding-top: var(--s-2);
}

.proj-code {
	margin-top: var(--s-2);
	overflow: hidden;
	border: 1px solid var(--line);
	border-radius: var(--r-3);
	background: var(--surface-deep);
}

.proj-code__bar {
	display: flex;
	align-items: center;
	gap: var(--s-3);
	min-height: 40px;
	padding: 0 6px 0 14px;
	border-bottom: 1px solid var(--line);
}

.proj-code__dots {
	display: flex;
	gap: 6px;
}

.proj-code__dots i {
	width: 10px;
	height: 10px;
	border-radius: 50%;
	background: var(--line-2);
}

.proj-code__file {
	flex: 1;
	font: 400 12px/1.4 var(--font-mono);
	color: var(--mute);
}

.proj-code pre {
	margin: 0;
	padding: var(--s-4) var(--s-5);
	overflow-x: auto;
	font: 400 13px/1.7 var(--font-mono);
	color: var(--fg);
}

.proj-code__copy {
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
	.proj-previews,
	.proj-start,
	.proj-bench,
	.proj-grid {
		grid-template-columns: 1fr;
	}

	.proj-start__tabs {
		flex-direction: row;
		overflow-x: auto;
		border-right: 0;
		border-bottom: 1px solid var(--line);
	}

	.proj-start__tab {
		flex: 0 0 auto;
	}
}
</style>
