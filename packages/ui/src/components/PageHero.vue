<script setup lang="ts">
import PixelField from './PixelField.vue';

export interface PageHeroStat {
  label: string;
  value: string;
  channel?: 'stable' | 'beta' | 'alpha' | 'experimental';
}

defineProps<{
  title: string;
  tagline?: string;
  lede?: string;
  stats?: PageHeroStat[];
}>();
</script>

<template>
	<section class="bx-page-hero" data-nav-overlay>
		<PixelField variant="field" />

		<div class="bx-page-hero__inner">
			<div class="bx-page-hero__top" :class="{ 'bx-page-hero__top--aside': $slots.aside }">
				<div class="bx-page-hero__main">
					<nav v-if="$slots.crumbs" class="bx-page-hero__crumbs" aria-label="Breadcrumb" data-quiet>
						<slot name="crumbs" />
					</nav>

					<div class="bx-page-hero__title" data-quiet>
						<h1>{{ title }}</h1>
						<slot name="badge" />
					</div>

					<p v-if="tagline" class="bx-page-hero__tagline" data-quiet>{{ tagline }}</p>
					<p v-if="lede" class="bx-page-hero__lede" data-quiet>{{ lede }}</p>

					<div v-if="$slots.cta" class="bx-page-hero__cta" data-quiet>
						<slot name="cta" />
					</div>

					<div v-if="$slots.meta" class="bx-page-hero__meta" data-quiet>
						<slot name="meta" />
					</div>
				</div>

				<aside v-if="$slots.aside" class="bx-page-hero__aside" data-quiet>
					<slot name="aside" />
				</aside>
			</div>

			<dl v-if="stats?.length" class="bx-page-hero__stats" data-quiet>
				<div v-for="s in stats" :key="s.label" class="bx-page-hero__stat">
					<dt>{{ s.label }}</dt>
					<dd :class="s.channel && `bx-page-hero__stat--${s.channel}`">{{ s.value }}</dd>
				</div>
			</dl>
		</div>
	</section>
</template>

<style scoped>
.bx-page-hero {
	position: relative;
	overflow: hidden;
	margin-top: -56px;
	padding-top: 56px;
	background: var(--pixel-bg);
	border-bottom: 1px solid var(--line);
}

.bx-page-hero__inner {
	position: relative;
	max-width: var(--container);
	margin: 0 auto;
	padding: var(--s-16) var(--s-8) var(--s-12);
}

.bx-page-hero__top--aside {
	display: grid;
	grid-template-columns: minmax(0, 1fr) 340px;
	gap: var(--s-10);
	align-items: start;
}

.bx-page-hero__main {
	min-width: 0;
}

.bx-page-hero__aside {
	min-width: 0;
	margin-top: var(--s-8);
	background: var(--surface-card);
	border: 1px solid var(--line);
	border-radius: var(--r-1);
}

.bx-page-hero__crumbs {
	display: flex;
	flex-wrap: wrap;
	gap: var(--s-2);
	width: fit-content;
	font: 400 13px/1.4 var(--font-mono);
	color: var(--mute);
}

.bx-page-hero__crumbs :deep(a) {
	color: var(--dim);
	transition: color 0.15s ease;
}

.bx-page-hero__crumbs :deep(a:hover) {
	color: var(--accent);
}

.bx-page-hero__crumbs :deep([aria-current]) {
	color: var(--fg);
}

.bx-page-hero__title {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--s-3) var(--s-4);
	width: fit-content;
	margin-top: var(--s-8);
}

.bx-page-hero__title h1 {
	margin: 0;
	font: 600 56px/1.05 var(--font-sans);
	letter-spacing: -0.025em;
	color: var(--fg-hi);
}

.bx-page-hero__tagline {
	max-width: 40rem;
	margin: var(--s-5) 0 0;
	font: 400 24px/1.35 var(--font-mono);
	color: var(--fg);
	text-wrap: balance;
}

.bx-page-hero__lede {
	max-width: 40rem;
	margin: var(--s-4) 0 0;
	font: 400 15px/1.6 var(--font-mono);
	color: var(--dim);
	text-wrap: pretty;
}

.bx-page-hero__cta {
	display: flex;
	flex-wrap: wrap;
	gap: var(--s-3);
	width: fit-content;
	margin-top: var(--s-8);
}

.bx-page-hero__meta {
	width: fit-content;
	margin-top: var(--s-4);
	font: 400 13px/1.5 var(--font-mono);
	color: var(--mute);
}

.bx-page-hero__stats {
	display: grid;
	grid-template-columns: repeat(4, minmax(0, 1fr));
	margin: var(--s-12) 0 0;
	border-top: 1px solid var(--line);
	border-left: 1px solid var(--line);
	background: var(--surface-deep);
}

.bx-page-hero__stat {
	padding: var(--s-5) var(--s-6);
	border-right: 1px solid var(--line);
	border-bottom: 1px solid var(--line);
}

.bx-page-hero__stat dt {
	font: 500 11px/1.4 var(--font-mono);
	letter-spacing: 0.1em;
	text-transform: uppercase;
	color: var(--mute);
}

.bx-page-hero__stat dd {
	margin: var(--s-2) 0 0;
	font: 600 26px/1.15 var(--font-sans);
	letter-spacing: -0.02em;
	color: var(--fg);
	overflow-wrap: anywhere;
}

.bx-page-hero__stat dd[class] {
	text-transform: capitalize;
}

.bx-page-hero__stat dd.bx-page-hero__stat--stable { color: var(--ch-stable); }
.bx-page-hero__stat dd.bx-page-hero__stat--beta { color: var(--ch-beta); }
.bx-page-hero__stat dd.bx-page-hero__stat--alpha { color: var(--ch-alpha); }
.bx-page-hero__stat dd.bx-page-hero__stat--experimental { color: var(--ch-experimental); }

@media (max-width: 1023px) {
	.bx-page-hero__top--aside {
		grid-template-columns: minmax(0, 1fr);
		gap: 0;
	}

	.bx-page-hero__stats {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
}

@media (max-width: 860px) {
	.bx-page-hero__inner {
		padding: var(--s-10) var(--s-4) var(--s-8);
	}

	.bx-page-hero__title h1 {
		font-size: 40px;
	}

	.bx-page-hero__tagline {
		font-size: 19px;
	}
}
</style>
