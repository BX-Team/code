<script setup lang="ts">
interface TocLink {
	id: string
	text: string
	depth: number
	children?: TocLink[]
}

definePageMeta({ layout: 'docs' })

const route = useRoute()
const toc = useState<TocLink[]>('docs:toc', () => [])

const { data: page } = await useAsyncData(
	`docs-page:${route.path}`,
	() => queryCollection('docs').path(route.path).first(),
	{ watch: [() => route.path] },
)

const docStem = useState<string>('docs:stem', () => '')
const docTitle = useState<string>('docs:title', () => '')
watch(
	page,
	(p) => {
		docStem.value = (p as any)?.stem ?? ''
		docTitle.value = p?.title ?? ''
	},
	{ immediate: true },
)

const { data: surr } = await useAsyncData(
	`docs-surr:${route.path}`,
	() => queryCollectionItemSurroundings('docs', route.path, { fields: ['title', 'path'] }),
	{ watch: [() => route.path] },
)

watch(
	page,
	(p) => {
		toc.value = (p?.body as any)?.toc?.links || []
	},
	{ immediate: true },
)

useHead({
	title: computed(() => page.value?.title || 'Documentation'),
})

if (!page.value) {
	throw createError({ statusCode: 404, statusMessage: 'Page not found' })
}

const prev = computed(() => surr.value?.[0] ?? null)
const next = computed(() => surr.value?.[1] ?? null)

const breadcrumbs = computed(() => {
	const parts = route.path.replace('/docs/', '').split('/')
	return parts.map((part, i) => ({
		label: part.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
		path: '/docs/' + parts.slice(0, i + 1).join('/'),
	}))
})
</script>

<template>
	<article v-if="page" class="doc">
		<div class="crumbs">
			<NuxtLink to="/docs">Docs</NuxtLink>
			<span class="sep">/</span>
			<template v-for="(crumb, i) in breadcrumbs" :key="crumb.path">
				<NuxtLink v-if="i < breadcrumbs.length - 1" :to="crumb.path">{{ crumb.label }}</NuxtLink>
				<span v-else class="here">{{ crumb.label }}</span>
				<span v-if="i < breadcrumbs.length - 1" class="sep">/</span>
			</template>
		</div>

		<h1 class="doc-h1">{{ page.title }}</h1>
		<p v-if="page.description" class="doc-lede">{{ page.description }}</p>

		<ContentRenderer :value="page" class="doc-body" />

		<nav v-if="prev || next" class="doc-footer-nav">
			<NuxtLink v-if="prev" :to="(prev as any).path" class="prev">
				<span class="lab">← Previous</span>
				<span class="ttl">{{ (prev as any).title }}</span>
			</NuxtLink>
			<div v-else />
			<NuxtLink v-if="next" :to="(next as any).path" class="next">
				<span class="lab">Next →</span>
				<span class="ttl">{{ (next as any).title }}</span>
			</NuxtLink>
		</nav>
	</article>
</template>

<style scoped>
.doc {
	max-width: 720px;
	margin: 0 auto;
	min-width: 0;
	overflow-x: clip;
}

/* Breadcrumbs */
.crumbs {
	display: flex;
	align-items: center;
	gap: 6px;
	font: 500 12.5px var(--font-sans);
	color: var(--mute);
	margin-bottom: 12px;
	flex-wrap: wrap;
}
.crumbs a {
	color: var(--mute);
	text-decoration: none;
}
.crumbs a:hover {
	color: var(--fg-hi);
}
.crumbs .sep {
	opacity: 0.5;
}
.crumbs .here {
	color: var(--dim);
}

/* Page header */
.doc-h1 {
	font: 700 36px/1.15 var(--font-sans);
	letter-spacing: -0.025em;
	color: var(--fg-hi);
	margin: 0 0 14px;
}
.doc-lede {
	font: 400 16px/1.55 var(--font-sans);
	color: var(--dim);
	margin: 0 0 32px;
	text-wrap: pretty;
}

/* Content body — style nuxt/content rendered HTML */
.doc-body :deep(h2) {
	font: 700 24px/1.25 var(--font-sans);
	letter-spacing: -0.015em;
	color: var(--fg-hi);
	margin: 48px 0 14px;
	scroll-margin-top: 80px;
}
.doc-body :deep(h3) {
	font: 600 18px/1.3 var(--font-sans);
	letter-spacing: -0.01em;
	color: var(--fg-hi);
	margin: 28px 0 10px;
	scroll-margin-top: 80px;
}
.doc-body :deep(h4) {
	font: 600 15px/1.4 var(--font-sans);
	color: var(--fg-hi);
	margin: 20px 0 8px;
}
.doc-body :deep(h2 a),
.doc-body :deep(h3 a),
.doc-body :deep(h4 a) {
	color: inherit;
	border-bottom: none;
}
.doc-body :deep(p) {
	margin: 0 0 16px;
	color: var(--fg);
	line-height: 1.65;
	font-size: 15px;
	text-wrap: pretty;
}
.doc-body :deep(p strong) {
	color: var(--fg-hi);
	font-weight: 600;
}
.doc-body :deep(a) {
	color: var(--brand);
	border-bottom: 1px solid color-mix(in oklab, var(--brand) 40%, transparent);
	transition: border-color 0.15s;
	text-decoration: none;
}
.doc-body :deep(a:hover) {
	border-bottom-color: var(--brand);
}
.doc-body :deep(code) {
	font: 500 13px var(--font-mono);
	color: var(--fg-hi);
	background: var(--bg-2);
	border: 1px solid var(--line);
	padding: 1px 6px;
	border-radius: 4px;
}
.doc-body :deep(pre) {
	background: oklch(0.10 0.005 240);
	border: 1px solid var(--line);
	border-radius: 10px;
	padding: 16px 18px;
	margin: 22px 0;
	overflow-x: auto;
	font: 400 13px/1.65 var(--font-mono);
	color: var(--fg);
}
/* Shiki transformer annotations */
.doc-body :deep(pre .line.diff.add) {
	background: color-mix(in oklab, oklch(0.65 0.2 145) 15%, transparent);
}
.doc-body :deep(pre .line.diff.remove) {
	background: color-mix(in oklab, var(--err) 15%, transparent);
	opacity: 0.7;
}
.doc-body :deep(pre .line.highlighted) {
	background: color-mix(in oklab, var(--brand) 12%, transparent);
}
.doc-body :deep(pre .line.focused) {
	filter: none;
}
.doc-body :deep(pre:not(:has(.focused)) .line),
.doc-body :deep(pre .line:not(.focused)) {
	transition: opacity 0.2s;
}
.doc-body :deep(pre:has(.focused) .line:not(.focused)) {
	opacity: 0.4;
}
.doc-body :deep(.highlighted-word) {
	background: color-mix(in oklab, var(--brand) 20%, transparent);
	border: 1px solid color-mix(in oklab, var(--brand) 40%, transparent);
	border-radius: 3px;
	padding: 0 2px;
}

.doc-body :deep(pre code) {
	background: none;
	border: none;
	padding: 0;
	font-size: inherit;
	color: inherit;
}
.doc-body :deep(ul),
.doc-body :deep(ol) {
	margin: 0 0 18px;
	padding: 0;
	list-style: none;
}
.doc-body :deep(ul > li),
.doc-body :deep(ol > li) {
	position: relative;
	padding: 4px 0 4px 20px;
	font-size: 15px;
	line-height: 1.6;
	color: var(--fg);
}
.doc-body :deep(ul > li)::before {
	content: "";
	position: absolute;
	left: 4px;
	top: 14px;
	width: 5px;
	height: 5px;
	border-radius: 50%;
	background: var(--brand);
	box-shadow: 0 0 6px color-mix(in oklab, var(--brand) 60%, transparent);
}
.doc-body :deep(ol) {
	counter-reset: list-counter;
}
.doc-body :deep(ol > li) {
	counter-increment: list-counter;
	padding-left: 30px;
}
.doc-body :deep(ol > li)::before {
	content: counter(list-counter) ".";
	position: absolute;
	left: 0;
	top: 7px;
	width: 24px;
	text-align: right;
	font: 600 13px var(--font-mono);
	color: var(--brand);
}
.doc-body :deep(li strong) {
	color: var(--fg-hi);
	font-weight: 600;
}
.doc-body :deep(blockquote) {
	margin: 22px 0;
	padding: 16px 18px;
	border-left: 3px solid var(--brand);
	background: var(--bg-1);
	border-radius: 0 8px 8px 0;
	color: var(--dim);
	font-size: 15px;
	line-height: 1.6;
}
.doc-body :deep(hr) {
	border: none;
	border-top: 1px solid var(--line);
	margin: 40px 0;
}
.doc-body :deep(table) {
	width: 100%;
	border-collapse: collapse;
	margin: 22px 0;
	font-size: 14px;
}
.doc-body :deep(th) {
	text-align: left;
	padding: 8px 12px;
	border-bottom: 2px solid var(--line);
	font: 600 12px var(--font-mono);
	color: var(--mute);
	text-transform: uppercase;
	letter-spacing: 0.06em;
}
.doc-body :deep(td) {
	padding: 10px 12px;
	border-bottom: 1px solid var(--line);
	color: var(--fg);
	line-height: 1.5;
}
.doc-body :deep(tr:last-child td) {
	border-bottom: none;
}
.doc-body :deep(img) {
	max-width: 100%;
	border-radius: 8px;
	border: 1px solid var(--line);
	margin: 16px 0;
}

/* Footer prev/next nav */
.doc-footer-nav {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 12px;
	margin: 56px 0 0;
	padding-top: 24px;
	border-top: 1px solid var(--line);
}
.doc-footer-nav a {
	display: block;
	padding: 14px 16px;
	border: 1px solid var(--line);
	border-radius: 10px;
	background: var(--bg-1);
	transition: border-color 0.15s;
	text-decoration: none;
}
.doc-footer-nav a:hover {
	border-color: var(--line-2);
}
.doc-footer-nav .lab {
	font: 500 11.5px var(--font-mono);
	color: var(--mute);
	text-transform: uppercase;
	letter-spacing: 0.06em;
	display: block;
}
.doc-footer-nav .ttl {
	font: 600 14px var(--font-sans);
	color: var(--fg-hi);
	margin-top: 3px;
	display: block;
}
.doc-footer-nav .next {
	text-align: right;
}

/* Callouts from MDC */
.doc-body :deep(.callout) {
	display: grid;
	grid-template-columns: 22px 1fr;
	gap: 14px;
	padding: 16px 18px;
	border: 1px solid var(--line);
	border-radius: 10px;
	background: var(--bg-1);
	margin: 22px 0;
	font-size: 14px;
	line-height: 1.55;
}
.doc-body :deep(.callout-info) {
	border-color: color-mix(in oklab, var(--brand) 35%, var(--line));
	background: color-mix(in oklab, var(--brand-soft) 25%, var(--bg-1));
}
.doc-body :deep(.callout-warn) {
	border-color: color-mix(in oklab, var(--warn) 35%, var(--line));
	background: color-mix(in oklab, var(--warn) 8%, var(--bg-1));
}
.doc-body :deep(.callout-success) {
	border-color: color-mix(in oklab, var(--brand-2) 35%, var(--line));
	background: color-mix(in oklab, var(--brand-2) 8%, var(--bg-1));
}

/* Mobile */
@media (max-width: 640px) {
	.doc-h1 {
		font-size: 28px;
	}
	.doc-footer-nav {
		grid-template-columns: 1fr;
	}
	.doc-footer-nav .next {
		text-align: left;
	}
}
</style>
