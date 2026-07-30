<script setup lang="ts">
import { Footer, Navbar } from '@bx-team/ui';
import { Scale } from '@lucide/vue';
import { DISCORD_URL, GITHUB_URL } from '~/config/links';

const route = useRoute();

const { data: session } = await useSession();
const loggedIn = computed(() => !!session.value?.user);

const { data: page } = await useAsyncData(`legal:${route.params.slug}`, () =>
  queryCollection('legal').path(route.path).first(),
);

if (!page.value) {
  throw createError({ statusCode: 404, statusMessage: 'Page not found' });
}

useHead({
  title: computed(() => page.value?.title ?? 'Legal'),
});

const related = computed(() => {
  const all = [
    { title: 'Privacy Policy', path: '/legal/privacy-policy' },
    { title: 'Terms of Use', path: '/legal/terms-of-use' },
  ];
  return all.filter(d => d.path !== route.path);
});
</script>

<template>
	<div class="legal-root">
		<div class="legal-atmosphere" aria-hidden="true" />

		<Navbar :discord-href="DISCORD_URL" :logged-in="loggedIn" />

		<main class="legal-wrap">
			<div class="legal-header">
				<div class="legal-icon">
					<Scale :size="20" :stroke-width="1.6" />
				</div>
				<p class="legal-eyebrow">Legal</p>
				<h1 class="legal-title">{{ page!.title }}</h1>
				<p v-if="page!.description" class="legal-desc">{{ page!.description }}</p>
				<p v-if="(page! as any).lastUpdated" class="legal-meta">Last updated: {{ (page! as any).lastUpdated }}</p>
			</div>

			<article class="legal-body">
				<ContentRenderer :value="page!" />
			</article>

			<div class="legal-related">
				<p class="related-label">Other legal documents</p>
				<div class="related-links">
					<NuxtLink v-for="doc in related" :key="doc.path" :to="doc.path" class="related-link">
						<Scale :size="14" :stroke-width="1.6" />
						{{ doc.title }}
					</NuxtLink>
				</div>
			</div>
		</main>

		<Footer
			:github-href="GITHUB_URL"
			:discord-href="DISCORD_URL"
		/>
	</div>
</template>

<style scoped>
.legal-root {
	min-height: 100vh;
	background: var(--bg-0);
	color: var(--fg);
	font-family: var(--font-sans);
	position: relative;
	overflow-x: hidden;
}

.legal-atmosphere {
	position: absolute;
	inset: 0 0 auto 0;
	height: 560px;
	pointer-events: none;
	z-index: 0;
}
.legal-atmosphere::before {
	content: "";
	position: absolute;
	top: -180px;
	left: 50%;
	transform: translateX(-50%);
	width: 1200px;
	height: 800px;
	background: radial-gradient(ellipse 50% 45% at 50% 50%, color-mix(in oklab, var(--brand-glow) 55%, var(--brand-glow-2)), transparent 70%);
	filter: blur(80px);
	opacity: 0.3;
}
.legal-atmosphere::after {
	content: "";
	position: absolute;
	inset: 0;
	background-image:
		linear-gradient(to right,  rgba(255,255,255,.025) 1px, transparent 1px),
		linear-gradient(to bottom, rgba(255,255,255,.025) 1px, transparent 1px);
	background-size: 56px 56px;
	mask-image: radial-gradient(ellipse 80% 60% at 50% 20%, black 0%, transparent 75%);
}

.legal-wrap {
	position: relative;
	z-index: 1;
	max-width: 780px;
	margin: 0 auto;
	padding: 80px 32px 96px;
}

.legal-header {
	text-align: center;
	margin-bottom: 64px;
	padding-bottom: 48px;
	border-bottom: 1px solid var(--line);
}

.legal-icon {
	display: inline-grid;
	place-items: center;
	width: 48px;
	height: 48px;
	border-radius: 12px;
	background: color-mix(in oklab, var(--brand-soft) 80%, transparent);
	border: 1px solid color-mix(in oklab, var(--brand) 25%, var(--line));
	color: var(--brand);
	margin-bottom: 20px;
}

.legal-eyebrow {
	font: 600 11.5px var(--font-mono);
	letter-spacing: 0.1em;
	text-transform: uppercase;
	color: var(--brand);
	margin: 0 0 12px;
}

.legal-title {
	font: 700 40px/1.15 var(--font-sans);
	letter-spacing: -0.03em;
	color: var(--fg-hi);
	margin: 0 0 16px;
}

.legal-desc {
	font: 400 16px/1.6 var(--font-sans);
	color: var(--dim);
	margin: 0 0 16px;
	max-width: 56ch;
	margin-left: auto;
	margin-right: auto;
	text-wrap: pretty;
}

.legal-meta {
	font: 400 13px var(--font-mono);
	color: var(--mute);
	margin: 0;
}

/* --- body markdown styles --- */
.legal-body :deep(h2) {
	font: 700 22px/1.3 var(--font-sans);
	letter-spacing: -0.015em;
	color: var(--fg-hi);
	margin: 52px 0 14px;
	padding-top: 4px;
	scroll-margin-top: 80px;
}

.legal-body :deep(h3) {
	font: 600 17px/1.35 var(--font-sans);
	letter-spacing: -0.01em;
	color: var(--fg-hi);
	margin: 30px 0 10px;
	scroll-margin-top: 80px;
}

.legal-body :deep(p) {
	font-size: 15px;
	line-height: 1.7;
	color: var(--fg);
	margin: 0 0 16px;
	text-wrap: pretty;
}

.legal-body :deep(p strong),
.legal-body :deep(li strong) {
	color: var(--fg-hi);
	font-weight: 600;
}

.legal-body :deep(a) {
	color: var(--brand);
	text-decoration: none;
	border-bottom: 1px solid color-mix(in oklab, var(--brand) 35%, transparent);
	transition: border-color 0.15s;
}
.legal-body :deep(a:hover) {
	border-bottom-color: var(--brand);
}

.legal-body :deep(ul),
.legal-body :deep(ol) {
	margin: 0 0 18px;
	padding: 0;
	list-style: none;
}

.legal-body :deep(ul > li),
.legal-body :deep(ol > li) {
	position: relative;
	padding: 3px 0 3px 20px;
	font-size: 15px;
	line-height: 1.65;
	color: var(--fg);
}

.legal-body :deep(ul > li)::before {
	content: "";
	position: absolute;
	left: 4px;
	top: 13px;
	width: 5px;
	height: 5px;
	border-radius: 50%;
	background: var(--brand);
}

.legal-body :deep(ol) {
	counter-reset: legal-list;
}
.legal-body :deep(ol > li) {
	counter-increment: legal-list;
	padding-left: 30px;
}
.legal-body :deep(ol > li)::before {
	content: counter(legal-list) ".";
	position: absolute;
	left: 0;
	top: 6px;
	width: 24px;
	text-align: right;
	font: 600 13px var(--font-mono);
	color: var(--brand);
}

.legal-body :deep(table) {
	width: 100%;
	border-collapse: collapse;
	margin: 24px 0;
	font-size: 14px;
}

.legal-body :deep(th) {
	text-align: left;
	padding: 9px 14px;
	border-bottom: 2px solid var(--line);
	font: 600 11.5px var(--font-mono);
	color: var(--mute);
	text-transform: uppercase;
	letter-spacing: 0.06em;
	background: var(--bg-1);
}

.legal-body :deep(td) {
	padding: 10px 14px;
	border-bottom: 1px solid var(--line);
	color: var(--fg);
	line-height: 1.5;
}

.legal-body :deep(tr:last-child td) {
	border-bottom: none;
}

.legal-body :deep(code) {
	font: 500 13px var(--font-mono);
	color: var(--fg-hi);
	background: var(--bg-2);
	border: 1px solid var(--line);
	padding: 1px 6px;
	border-radius: 4px;
}

.legal-body :deep(blockquote) {
	margin: 22px 0;
	padding: 14px 18px;
	border-left: 3px solid var(--brand);
	background: var(--bg-1);
	border-radius: 0 8px 8px 0;
	color: var(--dim);
	font-size: 15px;
	line-height: 1.6;
}

.legal-body :deep(hr) {
	border: none;
	border-top: 1px solid var(--line);
	margin: 44px 0;
}

/* --- related section --- */
.legal-related {
	margin-top: 64px;
	padding-top: 32px;
	border-top: 1px solid var(--line);
}

.related-label {
	font: 600 11.5px var(--font-mono);
	letter-spacing: 0.08em;
	text-transform: uppercase;
	color: var(--mute);
	margin: 0 0 14px;
}

.related-links {
	display: flex;
	flex-wrap: wrap;
	gap: 10px;
}

.related-link {
	display: inline-flex;
	align-items: center;
	gap: 8px;
	padding: 9px 16px;
	background: var(--bg-1);
	border: 1px solid var(--line);
	border-radius: 8px;
	font: 500 13.5px var(--font-sans);
	color: var(--dim);
	text-decoration: none;
	transition: color 0.15s, border-color 0.15s;
}
.related-link :deep(svg) {
	color: var(--mute);
	flex-shrink: 0;
}
.related-link:hover {
	color: var(--fg-hi);
	border-color: var(--line-2);
}

@media (max-width: 640px) {
	.legal-wrap {
		padding: 48px 20px 72px;
	}
	.legal-title {
		font-size: 30px;
	}
	.legal-body :deep(th),
	.legal-body :deep(td) {
		padding: 8px 10px;
		font-size: 13px;
	}
}
</style>
