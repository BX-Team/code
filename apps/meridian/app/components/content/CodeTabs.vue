<script setup lang="ts">
interface Tab {
	label: string
	lang?: string
	code?: string
	html?: string
	filename?: string
}

const props = withDefaults(defineProps<{
	tabs: Tab[]
	defaultTab?: number
	highlight?: boolean
	theme?: string
}>(), {
	defaultTab: 0,
	highlight: true,
	theme: 'bx-team-dark',
})

const active = ref(props.defaultTab)
const copied = ref(false)
const highlighted = shallowRef<Record<number, string>>({})

const current = computed(() => props.tabs[active.value])

let alive = true
onBeforeUnmount(() => { alive = false })

async function doHighlight(idx: number) {
	const t = props.tabs[idx]
	if (!t || highlighted.value[idx] || !props.highlight) return
	if (t.html) {
		highlighted.value = { ...highlighted.value, [idx]: t.html }
		return
	}
	if (!t.code) return
	try {
		const { codeToHtml } = await import('shiki')
		const html = await codeToHtml(t.code, { lang: t.lang || 'text', theme: props.theme })
		if (!alive) return
		highlighted.value = { ...highlighted.value, [idx]: html }
	} catch {
		if (!alive) return
		highlighted.value = {
			...highlighted.value,
			[idx]: `<pre><code>${escapeHtml(t.code)}</code></pre>`,
		}
	}
}

function escapeHtml(s: string) {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

watch(() => active.value, (i) => doHighlight(i), { immediate: true })

async function copy() {
	const raw = current.value?.code
		?? stripTags(highlighted.value[active.value] || current.value?.html || '')
	if (!raw) return
	try {
		await navigator.clipboard.writeText(raw)
		copied.value = true
		setTimeout(() => (copied.value = false), 1400)
	} catch { /* no-op */ }
}

function stripTags(html: string) {
	if (typeof document === 'undefined') return html.replace(/<[^>]+>/g, '')
	const el = document.createElement('div')
	el.innerHTML = html
	return el.textContent || ''
}
</script>

<template>
	<div class="code-block">
		<div class="cb-hd">
			<div class="cb-tabs" role="tablist">
				<button
					v-for="(t, i) in tabs"
					:key="(t.label || t.filename || '') + i"
					role="tab"
					:aria-selected="i === active"
					class="cb-tab"
					:class="{ active: i === active }"
					@click="active = i"
				>
					{{ t.label || t.filename }}
				</button>
			</div>
			<button class="cb-copy" :title="copied ? 'Copied' : 'Copy'" @click="copy">
				<svg v-if="!copied" width="13" height="13" viewBox="0 0 24 24" fill="none"
					stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
					<rect x="9" y="9" width="13" height="13" rx="2"/>
					<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
				</svg>
				<svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none"
					stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<polyline points="20 6 9 17 4 12"/>
				</svg>
				{{ copied ? 'Copied' : 'Copy' }}
			</button>
		</div>
		<div class="cb-body">
			<div v-if="highlighted[active]" class="cb-pre" v-html="highlighted[active]" />
			<pre v-else-if="current?.code" class="cb-pre"><code>{{ current.code }}</code></pre>
		</div>
	</div>
</template>

<style scoped>
.code-block {
	position: relative;
	background: var(--bg-0, oklch(0.10 0.005 240));
	border: 1px solid var(--line);
	border-radius: 10px;
	margin: 22px 0;
	overflow: hidden;
}

.cb-hd {
	display: flex;
	align-items: center;
	padding: 8px 12px;
	border-bottom: 1px solid var(--line);
	background: var(--bg-1);
}

.cb-tabs { display: flex; gap: 2px; }

.cb-tab {
	appearance: none;
	background: transparent;
	border: 0;
	padding: 4px 10px;
	font: 500 12px var(--font-mono);
	color: var(--mute);
	border-radius: 5px;
	cursor: pointer;
	transition: color .15s, background-color .15s;
}
.cb-tab:hover { color: var(--fg-hi); }
.cb-tab.active { color: var(--fg-hi); background: var(--bg-2); }

.cb-copy {
	margin-left: auto;
	display: inline-flex;
	align-items: center;
	gap: 6px;
	font: 500 11px var(--font-mono);
	color: var(--mute);
	padding: 4px 9px;
	border: 1px solid var(--line);
	border-radius: 5px;
	background: transparent;
	cursor: pointer;
	transition: color .15s, border-color .15s;
}
.cb-copy:hover { color: var(--fg-hi); border-color: var(--line-2); }

.cb-body :deep(pre),
.cb-body .cb-pre :deep(pre),
.cb-body > pre.cb-pre {
	margin: 0;
	padding: 16px 18px;
	font: 400 13px/1.65 var(--font-mono);
	color: var(--fg);
	background: transparent !important;
	white-space: pre;
	overflow-x: auto;
}

.cb-body :deep(code) {
	font: inherit;
	background: transparent;
}
</style>
