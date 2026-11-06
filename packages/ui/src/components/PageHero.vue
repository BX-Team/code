<script setup lang="ts">
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
	<section class="bx-page-hero">
		<div class="bx-page-hero__inner">
			<div class="bx-page-hero__grid" aria-hidden="true" />
			<div class="bx-page-hero__top" :class="{ 'bx-page-hero__top--aside': $slots.aside }">
				<div class="bx-page-hero__main">
					<nav v-if="$slots.crumbs" class="bx-page-hero__crumbs" aria-label="Breadcrumb">
						<slot name="crumbs" />
					</nav>

					<div class="bx-page-hero__title">
						<h1>{{ title }}</h1>
						<slot name="badge" />
					</div>

					<p v-if="tagline" class="bx-page-hero__tagline">{{ tagline }}</p>
					<p v-if="lede" class="bx-page-hero__lede">{{ lede }}</p>

					<div v-if="$slots.cta" class="bx-page-hero__cta">
						<slot name="cta" />
					</div>

					<div v-if="$slots.meta" class="bx-page-hero__meta">
						<slot name="meta" />
					</div>
				</div>

				<aside v-if="$slots.aside" class="bx-page-hero__aside">
					<slot name="aside" />
				</aside>
			</div>

			<dl v-if="stats?.length" class="bx-page-hero__stats">
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
	padding: var(--s-6) var(--s-4) 0;
}

.bx-page-hero__inner {
	position: relative;
	overflow: hidden;
	max-width: var(--container);
	box-sizing: border-box;
	margin: 0 auto;
	padding: var(--s-12) var(--s-10) var(--s-10);
	border: 1px solid var(--line);
	border-radius: var(--r-4);
	background:
		radial-gradient(60% 90% at 0% 0%, color-mix(in srgb, var(--accent) 12%, transparent), transparent 65%),
		radial-gradient(60% 90% at 100% 100%, color-mix(in srgb, var(--accent-2) 9%, transparent), transparent 65%),
		var(--surface-card);
}

.bx-page-hero__grid {
	position: absolute;
	inset: 0;
	pointer-events: none;
	background-image:
		linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
		linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
	background-size: 28px 28px;
	mask-image: radial-gradient(70% 80% at 30% 40%, #000, transparent);
}

.bx-page-hero__top,
.bx-page-hero__stats {
	position: relative;
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
	background: var(--surface-1);
	border: 1px solid var(--line);
	border-radius: var(--r-3);
}

.bx-page-hero__crumbs {
	display: flex;
	flex-wrap: wrap;
	gap: var(--s-2);
	width: fit-content;
	font: 400 13px/1.4 var(--font-sans);
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
	margin-top: var(--s-6);
}

.bx-page-hero__title h1 {
	margin: 0;
	font: 900 clamp(40px, 6vw, 72px) / 1 var(--font-sans);
	letter-spacing: -0.045em;
	color: var(--fg-hi);
}

.bx-page-hero__tagline {
	max-width: 40rem;
	margin: var(--s-5) 0 0;
	font: 400 20px/1.4 var(--font-sans);
	letter-spacing: -0.01em;
	color: var(--fg);
	text-wrap: balance;
}

.bx-page-hero__lede {
	max-width: 40rem;
	margin: var(--s-4) 0 0;
	font: 400 16px/1.6 var(--font-sans);
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
	font: 400 13px/1.5 var(--font-sans);
	color: var(--mute);
}

.bx-page-hero__stats {
	display: grid;
	grid-template-columns: repeat(4, minmax(0, 1fr));
	gap: 1px;
	margin: var(--s-10) 0 0;
	overflow: hidden;
	border: 1px solid var(--line);
	border-radius: var(--r-3);
	background: var(--line);
}

.bx-page-hero__stat {
	padding: var(--s-5) var(--s-6);
	background: var(--surface-1);
}

.bx-page-hero__stat dt {
	font: 500 11px/1.4 var(--font-mono);
	letter-spacing: 0.1em;
	text-transform: uppercase;
	color: var(--mute);
}

.bx-page-hero__stat dd {
	margin: var(--s-2) 0 0;
	font: 800 24px/1.15 var(--font-sans);
	letter-spacing: -0.03em;
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
		padding: var(--s-8) var(--s-5) var(--s-6);
	}

	.bx-page-hero__tagline {
		font-size: 17px;
	}
}
</style>
