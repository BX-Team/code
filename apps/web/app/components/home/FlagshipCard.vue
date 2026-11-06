<script setup lang="ts">
import { BENCHMARKS, type BenchProfile } from '~/config/benchmarks';
import type { Project } from '~/config/projects';
import { fetchLatestBuild, fetchProject, primaryDownload } from '~/lib/builds';
import { formatBytes } from '~/lib/format';

const props = defineProps<{ project: Project }>();

const link = resolveComponent('NuxtLink');

// The trailing capitals take the gradient: Divine|MC.
const nameParts = computed(() => {
  const match = props.project.name.match(/^(.*?)([A-Z]{2,})$/);
  return match ? [match[1], match[2]] : [props.project.name, ''];
});

// The home page is prerendered, so the release line is filled in by the browser.
const { data: latest } = useLazyAsyncData(
  `home-latest-${props.project.slug}`,
  async () => {
    const summary = await fetchProject(props.project.slug);
    if (!summary.latest) return null;
    const build = await fetchLatestBuild(props.project.slug, summary.latest);
    const file = primaryDownload(build.downloads);
    return {
      version: build.version,
      build: build.build,
      channel: build.channel,
      size: file ? formatBytes(file.size) : null,
      date: build.created_at.slice(0, 10),
    };
  },
  { server: false },
);

const bench = (build: 'divinemc' | 'paper' | 'purpur', profile: BenchProfile = 'stock') =>
  BENCHMARKS.botswarm.find(r => r.build === build && r.profile === profile);

// Median tick time under the botswarm load; lower is better, so the bar is the cost.
const bars = [
  { label: 'DivineMC', note: 'regionized', row: bench('divinemc', 'rct'), lead: true },
  { label: 'DivineMC', note: 'default', row: bench('divinemc') },
  { label: 'Paper', row: bench('paper') },
  { label: 'Purpur', row: bench('purpur') },
].flatMap(b => (b.row ? [{ ...b, ms: b.row.p50 }] : []));

const scale = Math.max(...bars.map(b => b.ms)) * 1.08;
const lead = bench('divinemc', 'rct');
</script>

<template>
	<component :is="link" :to="`/${project.slug}`" class="flagship">
		<div class="flagship__text">
			<div class="flagship__head">
				<span class="flagship__title">
					<span class="flagship__icon" aria-hidden="true">
						<HomeProjectMark :slug="project.slug" :size="24" />
					</span>
					<h2 class="flagship__name">{{ nameParts[0] }}<span class="bx-text-grad">{{ nameParts[1] }}</span></h2>
					<span class="flagship__badge">{{ project.tag }}</span>
				</span>
				<p class="flagship__summary">{{ project.lede }}</p>
			</div>
			<span class="flagship__more">Learn more <span aria-hidden="true">→</span></span>
		</div>

		<div class="flagship__window">
			<div class="flagship__bar">
				<span>Tick time, 150 players</span>
				<span>median mspt</span>
			</div>
			<div class="flagship__bench">
				<p v-if="lead" class="flagship__claim">
					<span class="bx-text-grad">−{{ Math.round(lead.p50VsPaper) }}%</span>
					<span>against Paper on the same load</span>
				</p>
				<ul class="flagship__bars">
					<li v-for="b in bars" :key="`${b.label}-${b.note}`" :class="{ lead: b.lead }">
						<span class="flagship__who">{{ b.label }}<small v-if="b.note">{{ b.note }}</small></span>
						<span class="flagship__track"><i :style="{ width: `${(b.ms / scale) * 100}%` }" /></span>
						<span class="flagship__ms">{{ b.ms.toFixed(1) }}</span>
					</li>
				</ul>
				<p class="flagship__note">Lower is better · {{ BENCHMARKS.cpu }} · {{ BENCHMARKS.minecraft }}</p>
			</div>
			<div class="flagship__release">
				<template v-if="latest">
					<span class="flagship__build">{{ latest.version }} #{{ latest.build }}</span>
					<span>{{ latest.channel }}<template v-if="latest.size"> · {{ latest.size }}</template></span>
					<span class="flagship__date">{{ latest.date }}</span>
				</template>
				<span v-else>Latest build</span>
			</div>
		</div>
	</component>
</template>

<style scoped>
.flagship {
	display: flex;
	flex-wrap: wrap;
	gap: var(--s-6);
	padding: var(--s-6);
	border: 1px solid var(--line);
	border-radius: var(--r-4);
	background: var(--surface-card);
	color: var(--fg);
	transition: background-color 0.15s ease;
}

.flagship:hover {
	background: var(--surface-2);
}

.flagship__text {
	flex: 1 1 340px;
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	gap: var(--s-6);
	padding: var(--s-1);
}

.flagship__head {
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.flagship__title {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 10px;
}

.flagship__icon {
	display: grid;
	place-items: center;
	width: 36px;
	height: 36px;
	border: 1px solid var(--line-2);
	border-radius: 9px;
	background: var(--surface-3);
	color: var(--fg);
}

.flagship__name {
	margin: 0;
	font: 700 28px/1.1 var(--font-sans);
	letter-spacing: -0.03em;
}

.flagship__name .bx-text-grad {
	font-weight: 900;
}

.flagship__badge {
	display: inline-flex;
	align-items: center;
	height: 22px;
	padding: 0 9px;
	border-radius: var(--r-pill);
	background: var(--accent-wash);
	color: var(--accent-2);
	font: 500 11px/1 var(--font-mono);
	letter-spacing: 0.06em;
	text-transform: uppercase;
}

.flagship__summary {
	margin: 0;
	max-width: 46ch;
	font: 400 15px/1.6 var(--font-sans);
	color: var(--dim);
}

.flagship__more {
	font: 500 14px/1 var(--font-sans);
	color: var(--accent);
}

.flagship__window {
	flex: 1.25 1 420px;
	min-width: 0;
	display: flex;
	flex-direction: column;
	overflow: hidden;
	border: 1px solid var(--line);
	border-radius: var(--r-3);
	background: var(--surface-deep);
}

.flagship__bar,
.flagship__release {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--s-3);
	min-height: 40px;
	padding: 0 14px;
	font: 400 12px/1.4 var(--font-mono);
	color: var(--mute);
}

.flagship__bar {
	border-bottom: 1px solid var(--line);
}

.flagship__bench {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 16px;
	padding: 18px 20px;
}

.flagship__claim {
	display: flex;
	flex-wrap: wrap;
	align-items: baseline;
	gap: 4px 12px;
	margin: 0;
	font: 400 13px/1.4 var(--font-mono);
	color: var(--mute);
}

.flagship__claim .bx-text-grad {
	font: 700 32px/1 var(--font-sans);
	letter-spacing: -0.03em;
}

.flagship__bars {
	display: flex;
	flex-direction: column;
	gap: 10px;
	margin: 0;
	padding: 0;
	list-style: none;
}

.flagship__bars li {
	display: grid;
	grid-template-columns: 12ch minmax(0, 1fr) 5ch;
	align-items: center;
	gap: 12px;
	font: 400 13px/1.3 var(--font-mono);
	color: var(--dim);
}

.flagship__bars li.lead {
	color: var(--fg-hi);
}

.flagship__who {
	display: flex;
	flex-direction: column;
}

.flagship__who small {
	font-size: 11px;
	color: var(--mute);
}

.flagship__track {
	height: 8px;
	border-radius: var(--r-pill);
	background: var(--surface-2);
	overflow: hidden;
}

.flagship__track i {
	display: block;
	height: 100%;
	border-radius: inherit;
	background: var(--line-2);
}

.lead .flagship__track i {
	background: linear-gradient(90deg, var(--accent), var(--accent-2));
}

.flagship__ms {
	text-align: right;
	font-variant-numeric: tabular-nums;
}

.flagship__note {
	margin: 0;
	font: 400 11.5px/1.4 var(--font-mono);
	color: var(--mute);
}

.flagship__release {
	flex-wrap: wrap;
	justify-content: flex-start;
	gap: 6px 14px;
	padding: 12px 14px;
	border-top: 1px solid var(--line);
	background: var(--surface-1);
	font-size: 13px;
}

.flagship__build {
	color: var(--fg);
	font-weight: 500;
}

.flagship__date {
	margin-left: auto;
}
</style>
