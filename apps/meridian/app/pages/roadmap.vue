<script setup lang="ts">
import { Activity, Box, Calendar, Database, Gift, Layers, Server, Zap } from '@lucide/vue';
import { computed, ref } from 'vue';

type Status = 'planned' | 'progress' | 'review' | 'shipped';

interface RoadmapItem {
  id: string;
  title: string;
  status: Status;
  progress?: number;
  description?: string;
}

interface RoadmapProject {
  path: string;
  title: string;
  slug: string;
  icon: string;
  accent?: string;
  order: number;
  blurb: string;
  items: RoadmapItem[];
  body?: unknown;
}

const ICONS: Record<string, unknown> = {
  activity: Activity,
  server: Server,
  gift: Gift,
  layers: Layers,
  box: Box,
  database: Database,
  zap: Zap,
  calendar: Calendar,
};

const STATUS_META: Record<Status, { label: string; dot: string }> = {
  planned: { label: 'Planned', dot: 'planned' },
  progress: { label: 'In progress', dot: 'progress' },
  review: { label: 'In review', dot: 'review' },
  shipped: { label: 'Shipped', dot: 'shipped' },
};

const { data: projects } = await useAsyncData(
  'roadmap:list',
  () => queryCollection('roadmap').order('order', 'ASC').all() as Promise<RoadmapProject[]>,
);

if (!projects.value || projects.value.length === 0) {
  throw createError({ statusCode: 404, statusMessage: 'No roadmap projects' });
}

const active = ref(projects.value[0]!.slug);

const activeProject = computed(() => projects.value!.find(p => p.slug === active.value) ?? projects.value![0]!);

const hasBody = computed(() => {
  const body = activeProject.value.body as { value?: unknown[] } | undefined;
  return Array.isArray(body?.value) && body.value.length > 0;
});

const groups = computed(() => {
  const p = activeProject.value;
  const planned = p.items.filter(i => i.status === 'planned');
  const groupsDef = [
    {
      id: 'now',
      label: 'Now',
      sub: 'In active development',
      dot: 'progress',
      items: p.items.filter(i => i.status === 'progress' || i.status === 'review'),
    },
    {
      id: 'next',
      label: 'Next',
      sub: 'Up after current cycle',
      dot: 'planned',
      items: planned.slice(0, 3),
    },
    {
      id: 'later',
      label: 'Later',
      sub: 'On the horizon',
      dot: 'planned',
      items: planned.slice(3),
    },
    {
      id: 'shipped',
      label: 'Shipped',
      sub: 'Already live',
      dot: 'shipped',
      items: p.items.filter(i => i.status === 'shipped'),
    },
  ];
  return groupsDef.filter(g => g.items.length > 0);
});

function iconFor(name: string) {
  return ICONS[name] ?? Box;
}

function progressLabel(item: RoadmapItem): string {
  if (item.status === 'shipped') return 'Done';
  if (item.status === 'planned') return '—';
  return `${item.progress ?? 0}%`;
}

function progressWidth(item: RoadmapItem): number {
  if (item.status === 'shipped') return 100;
  if (item.status === 'planned') return 0;
  return item.progress ?? 0;
}

useHead({
  title: 'Roadmap',
  meta: [
    {
      name: 'description',
      content: 'What we are working on next across BX Team projects — Pulsify, DivineMC and more.',
    },
  ],
});
</script>

<template>
	<PageShell>
		<div class="rm-root">
			<div class="rm-atmosphere" aria-hidden="true" />

			<div class="rm-wrap">
				<header class="rm-hd">
					<div class="rm-hd__intro">
						<p class="eyebrow">Roadmap</p>
						<h1>{{ activeProject.title }}</h1>
						<p class="blurb">{{ activeProject.blurb }}</p>
					</div>
					<div class="rm-hd__legend">
						<div class="legend-row"><span class="dot dot--progress" /> In&nbsp;progress</div>
						<div class="legend-row"><span class="dot dot--review" /> In&nbsp;review</div>
						<div class="legend-row"><span class="dot dot--planned" /> Planned</div>
						<div class="legend-row"><span class="dot dot--shipped" /> Shipped</div>
					</div>
				</header>

				<div class="rm-tabs-scroll">
					<div class="rm-tabs">
						<button
							v-for="p in projects"
							:key="p.slug"
							type="button"
							class="rm-tab"
							:class="{ 'rm-tab--active': active === p.slug }"
							@click="active = p.slug"
						>
							<span class="rm-tab__icon">
								<component :is="iconFor(p.icon)" :size="14" :stroke-width="1.7" />
							</span>
							{{ p.title }}
							<span class="rm-tab__count">{{ p.items.length }}</span>
						</button>
					</div>
				</div>

				<div class="rm-sections">
					<section v-for="g in groups" :key="g.id" class="rm-section">
						<header class="rm-section__hd">
							<div class="rm-section__label">
								<span class="dot" :class="`dot--${g.dot}`" />
								{{ g.label }}
							</div>
							<span class="rm-section__sub">{{ g.sub }}</span>
							<span class="rm-section__count">{{ g.items.length }}</span>
						</header>
						<div class="rm-list">
							<div
								v-for="item in g.items"
								:key="item.id"
								class="rm-row"
								:class="`rm-row--${item.status}`"
							>
								<div class="rm-row__badge" :class="`badge--${item.status}`">
									<span class="dot" :class="`dot--${item.status}`" />
									{{ STATUS_META[item.status].label }}
								</div>
								<div class="rm-row__title">
									<div class="t">{{ item.title }}</div>
									<div v-if="item.description" class="d">{{ item.description }}</div>
								</div>
								<div class="rm-row__progress">
									<div class="pl">
										<span>{{ progressLabel(item) }}</span>
									</div>
									<div class="bar"><i :style="{ width: `${progressWidth(item)}%` }" /></div>
								</div>
							</div>
						</div>
					</section>
				</div>

				<article v-if="hasBody" class="rm-body">
					<ContentRenderer :value="activeProject" />
				</article>
			</div>
		</div>
	</PageShell>
</template>

<style scoped>
.rm-root {
	position: relative;
	overflow: hidden;
}

.rm-atmosphere {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	height: 800px;
	pointer-events: none;
	overflow: hidden;
	z-index: 0;
}
.rm-atmosphere::before {
	content: '';
	position: absolute;
	top: -180px;
	left: 50%;
	transform: translateX(-50%);
	width: 1200px;
	height: 800px;
	background: radial-gradient(
		ellipse 50% 45% at 50% 50%,
		color-mix(in oklab, var(--brand-glow) 70%, var(--brand-glow-2)),
		transparent 70%
	);
	filter: blur(60px);
	opacity: 0.45;
}
.rm-atmosphere::after {
	content: '';
	position: absolute;
	inset: 0;
	background-image:
		linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
		linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
	background-size: 56px 56px;
	mask-image: radial-gradient(ellipse 80% 55% at 50% 25%, black 0%, transparent 75%);
	-webkit-mask-image: radial-gradient(ellipse 80% 55% at 50% 25%, black 0%, transparent 75%);
}

.rm-wrap {
	position: relative;
	z-index: 1;
	max-width: 1180px;
	margin: 0 auto;
	padding: 80px 32px 96px;
}

.rm-hd {
	display: flex;
	align-items: flex-end;
	justify-content: space-between;
	gap: 40px;
	margin-bottom: 36px;
}

.rm-hd .eyebrow {
	font: 600 11px var(--font-mono);
	letter-spacing: 0.08em;
	text-transform: uppercase;
	color: var(--brand);
	margin: 0;
}

.rm-hd h1 {
	margin: 12px 0 12px;
	font: 700 44px/1.05 var(--font-sans);
	letter-spacing: -0.025em;
	color: var(--fg-hi);
}

.rm-hd .blurb {
	margin: 0;
	color: var(--dim);
	font: 400 15.5px/1.55 var(--font-sans);
	max-width: 60ch;
}

.rm-hd__legend {
	display: flex;
	flex-direction: column;
	gap: 6px;
	font: 500 12px var(--font-mono);
	color: var(--mute);
	letter-spacing: 0.04em;
}

.legend-row {
	display: flex;
	align-items: center;
	gap: 8px;
}

.dot {
	width: 8px;
	height: 8px;
	border-radius: 50%;
	display: inline-block;
	background: var(--mute);
	flex-shrink: 0;
}
.dot--progress { background: var(--brand); }
.dot--review { background: var(--warn); }
.dot--shipped { background: var(--ok); }
.dot--planned { background: oklch(0.55 0.010 240); }

.rm-tabs-scroll {
	overflow-x: auto;
	margin: 0 -32px 32px;
	padding: 0 32px;
	scrollbar-width: none;
}
.rm-tabs-scroll::-webkit-scrollbar { display: none; }

.rm-tabs {
	display: inline-flex;
	gap: 4px;
	padding: 6px;
	background: color-mix(in oklab, var(--bg-1) 75%, transparent);
	-webkit-backdrop-filter: blur(20px);
	backdrop-filter: blur(20px);
	border: 1px solid var(--line);
	border-radius: 9999px;
	width: fit-content;
}

.rm-tab {
	display: inline-flex;
	align-items: center;
	gap: 8px;
	padding: 8px 16px;
	background: transparent;
	border: 1px solid transparent;
	color: var(--dim);
	font: 500 13px var(--font-sans);
	border-radius: 9999px;
	cursor: pointer;
	transition: color 0.15s, background 0.15s, border-color 0.15s;
	white-space: nowrap;
	min-height: 36px;
}
.rm-tab:hover { color: var(--fg-hi); }
.rm-tab--active {
	background: var(--bg-2);
	color: var(--fg-hi);
	border-color: var(--line);
}
.rm-tab__icon {
	display: inline-flex;
	color: var(--brand);
}
.rm-tab__count {
	font: 600 10.5px var(--font-mono);
	color: var(--mute);
	background: var(--bg-3);
	border: 1px solid var(--line);
	border-radius: 9999px;
	padding: 1px 7px;
}
.rm-tab--active .rm-tab__count { color: var(--fg); }

.rm-sections {
	display: flex;
	flex-direction: column;
	gap: 32px;
}

.rm-section__hd {
	display: flex;
	align-items: baseline;
	gap: 12px;
	padding-bottom: 12px;
	margin-bottom: 10px;
	border-bottom: 1px solid var(--line);
}
.rm-section__label {
	display: inline-flex;
	align-items: center;
	gap: 8px;
	font: 600 13px var(--font-sans);
	color: var(--fg-hi);
	letter-spacing: -0.005em;
}
.rm-section__sub {
	font: 400 12.5px var(--font-sans);
	color: var(--mute);
}
.rm-section__count {
	margin-left: auto;
	font: 600 10.5px var(--font-mono);
	color: var(--mute);
	background: var(--bg-2);
	border: 1px solid var(--line);
	border-radius: 9999px;
	padding: 2px 8px;
}

.rm-list {
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.rm-row {
	display: grid;
	grid-template-columns: 140px 1fr 200px;
	align-items: center;
	gap: 18px;
	padding: 14px 14px;
	border-radius: 8px;
	transition: background 0.15s;
}
.rm-row:hover { background: var(--bg-1); }

.rm-row__badge {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	font: 600 10.5px var(--font-mono);
	letter-spacing: 0.04em;
	padding: 3px 9px;
	border-radius: 9999px;
	border: 1px solid;
	width: fit-content;
	white-space: nowrap;
}
.rm-row__badge .dot {
	width: 6px;
	height: 6px;
}
.badge--planned {
	color: var(--mute);
	background: color-mix(in oklab, var(--mute) 18%, transparent);
	border-color: color-mix(in oklab, var(--mute) 35%, var(--line));
}
.badge--progress {
	color: var(--brand);
	background: var(--brand-soft);
	border-color: color-mix(in oklab, var(--brand) 50%, var(--line));
}
.badge--review {
	color: var(--warn);
	background: color-mix(in oklab, var(--warn) 18%, transparent);
	border-color: color-mix(in oklab, var(--warn) 45%, var(--line));
}
.badge--shipped {
	color: var(--ok);
	background: var(--brand-soft-2);
	border-color: color-mix(in oklab, var(--ok) 45%, var(--line));
}

.rm-row__title {
	display: flex;
	flex-direction: column;
	gap: 2px;
	min-width: 0;
}
.rm-row__title .t {
	font: 600 14px/1.3 var(--font-sans);
	color: var(--fg-hi);
}
.rm-row__title .d {
	font: 400 12.5px/1.5 var(--font-sans);
	color: var(--dim);
	display: -webkit-box;
	-webkit-line-clamp: 1;
	-webkit-box-orient: vertical;
	overflow: hidden;
}

.rm-row__progress {
	display: flex;
	flex-direction: column;
	gap: 6px;
}
.rm-row__progress .pl {
	display: flex;
	justify-content: flex-end;
	font: 500 11px var(--font-mono);
	color: var(--mute);
}
.rm-row__progress .bar {
	height: 3px;
	border-radius: 2px;
	background: var(--bg-2);
	overflow: hidden;
}
.rm-row__progress .bar > i {
	display: block;
	height: 100%;
	background: var(--brand);
	border-radius: inherit;
	transition: width 0.3s ease;
}
.rm-row--shipped .rm-row__progress .bar > i { background: var(--ok); }
.rm-row--review .rm-row__progress .bar > i { background: var(--warn); }

.rm-body {
	margin-top: 56px;
	padding-top: 32px;
	border-top: 1px solid var(--line);
}
.rm-body :deep(h2) {
	font: 700 22px/1.3 var(--font-sans);
	letter-spacing: -0.015em;
	color: var(--fg-hi);
	margin: 32px 0 14px;
}
.rm-body :deep(h3) {
	font: 600 17px/1.35 var(--font-sans);
	letter-spacing: -0.01em;
	color: var(--fg-hi);
	margin: 24px 0 10px;
}
.rm-body :deep(p) {
	font: 400 15px/1.7 var(--font-sans);
	color: var(--fg);
	margin: 0 0 16px;
}
.rm-body :deep(a) {
	color: var(--brand);
	text-decoration: none;
	border-bottom: 1px solid color-mix(in oklab, var(--brand) 35%, transparent);
	transition: border-color 0.15s;
}
.rm-body :deep(a:hover) { border-bottom-color: var(--brand); }
.rm-body :deep(code) {
	font: 500 13px var(--font-mono);
	color: var(--fg-hi);
	background: var(--bg-2);
	border: 1px solid var(--line);
	padding: 1px 6px;
	border-radius: 4px;
}

@media (max-width: 960px) {
	.rm-wrap { padding: 64px 24px 80px; }
	.rm-hd {
		flex-direction: column;
		align-items: flex-start;
		gap: 24px;
	}
	.rm-hd h1 { font-size: 36px; }
	.rm-hd__legend { flex-direction: row; flex-wrap: wrap; gap: 14px; }

	.rm-row {
		grid-template-columns: 1fr;
		gap: 10px;
		padding: 14px;
		background: var(--bg-1);
		border: 1px solid var(--line);
	}
	.rm-row:hover { background: var(--bg-2); }
}

@media (max-width: 560px) {
	.rm-wrap { padding: 48px 16px 64px; }
	.rm-hd h1 { font-size: 30px; }
}
</style>
