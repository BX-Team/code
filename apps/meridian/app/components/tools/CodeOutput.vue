<script setup lang="ts">
import { Check, Copy, Download } from '@lucide/vue';
import type { ThemedToken } from 'shiki/core';
import { computed, ref, shallowRef, watch, watchEffect } from 'vue';
import { type CodeLang, tokenize } from '@/lib/highlight';

export interface OutputTab {
  id: string;
  label: string;
  badge?: number;
  /** Download name, or null when the tab is a fragment rather than a file. */
  filename: string | null;
  code: string;
  lang: CodeLang;
  /** Shown instead of the code when there is nothing to write. */
  empty?: string;
}

const props = defineProps<{ tabs: OutputTab[]; tall?: boolean }>();
/** Local state unless a parent binds it. */
const active = defineModel<string>('active', { default: '' });
const copied = ref(false);

const current = computed(() => props.tabs.find(tab => tab.id === active.value) ?? props.tabs[0]);

watchEffect(() => {
  if (!props.tabs.some(tab => tab.id === active.value)) active.value = props.tabs[0]?.id ?? '';
});

const plain = computed(() => (current.value?.code ?? '').replace(/\n$/, '').split('\n'));
const coloured = shallowRef<ThemedToken[][] | null>(null);

/** Colour arrives after hydration; the page prerenders as plain text. */
watch(
  current,
  async tab => {
    coloured.value = null;
    if (!import.meta.client || !tab?.code) return;
    const code = tab.code;
    const lines = await tokenize(code, tab.lang);
    if (current.value?.code === code) coloured.value = lines;
  },
  { immediate: true },
);

async function copy() {
  const code = current.value?.code;
  if (!code) return;
  await navigator.clipboard.writeText(code);
  copied.value = true;
  setTimeout(() => {
    copied.value = false;
  }, 1600);
}

function download() {
  const tab = current.value;
  if (!tab?.filename) return;
  const url = URL.createObjectURL(new Blob([tab.code], { type: 'text/plain' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = tab.filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
</script>

<template>
	<section class="editor">
		<nav class="rail" :aria-label="'Output files'">
			<div class="rail-tabs">
				<button
					v-for="tab in tabs"
					:key="tab.id"
					type="button"
					class="rail-tab"
					:class="{ on: current?.id === tab.id, quiet: tab.badge === 0 }"
					@click="active = tab.id"
				>
					<span class="rail-name">{{ tab.label }}</span>
					<span v-if="tab.badge !== undefined" class="rail-badge">{{ tab.badge }}</span>
				</button>
			</div>
			<div v-if="$slots.rail" class="rail-foot">
				<slot name="rail" />
			</div>
		</nav>

		<div class="pane">
			<header class="pane-head">
				<span class="pane-title">{{ current?.filename ?? current?.label }}</span>
				<div class="pane-acts">
					<button v-if="current?.filename && current?.code" type="button" class="act" @click="download">
						<Download :size="13" :stroke-width="1.8" />
						<span>Download</span>
					</button>
					<button v-if="current?.code" type="button" class="act" @click="copy">
						<component :is="copied ? Check : Copy" :size="13" :stroke-width="1.8" />
						<span>{{ copied ? 'Copied' : 'Copy' }}</span>
					</button>
				</div>
			</header>

			<p v-if="!current?.code" class="pane-empty">{{ current?.empty ?? 'Nothing to show yet.' }}</p>

			<div v-else class="pane-body" :class="{ tall }">
				<pre v-if="coloured"><code><span v-for="(line, index) in coloured" :key="index" class="line"><span
					class="ln">{{ index + 1 }}</span><span v-for="(token, at) in line" :key="at" :style="{ color: token.color }">{{ token.content }}</span>
</span></code></pre>
				<pre v-else><code><span v-for="(line, index) in plain" :key="index" class="line"><span
					class="ln">{{ index + 1 }}</span>{{ line }}
</span></code></pre>
			</div>
		</div>
	</section>
</template>

<style scoped>
.editor {
	display: grid;
	grid-template-columns: minmax(180px, 216px) minmax(0, 1fr);
	border: 1px solid var(--line);
	border-radius: var(--r-lg);
	background: var(--bg-deep);
	overflow: hidden;
}

.rail {
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	gap: 8px;
	padding: 8px;
	border-right: 1px solid var(--line);
	background: var(--bg-1);
	min-width: 0;
}

.rail-tabs {
	display: flex;
	flex-direction: column;
	gap: 2px;
	min-width: 0;
}

.rail-tab {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
	min-height: 34px;
	padding: 0 10px;
	border: 0;
	border-radius: var(--r-sm);
	background: transparent;
	color: var(--mute);
	font: 500 12.5px/1.3 var(--font-mono);
	text-align: left;
	cursor: pointer;
	transition: background-color 0.15s, color 0.15s;
}

.rail-tab:hover {
	background: var(--bg-2);
	color: var(--fg);
}

.rail-tab.on {
	background: var(--bg-3);
	color: var(--fg-hi);
}

.rail-name {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.rail-badge {
	flex: none;
	font: 500 11px/1 var(--font-sans);
	color: var(--mute);
	font-variant-numeric: tabular-nums;
}

.rail-tab.on .rail-badge {
	color: var(--fg);
}

.rail-tab.quiet .rail-name {
	opacity: 0.55;
}

.rail-foot {
	padding-top: 8px;
	border-top: 1px solid var(--line);
}

.pane {
	display: flex;
	flex-direction: column;
	min-width: 0;
}

.pane-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	padding: 8px 10px 8px 14px;
	border-bottom: 1px solid var(--line);
	background: color-mix(in oklab, var(--bg-1) 60%, transparent);
}

.pane-title {
	font: 500 12.5px/1 var(--font-mono);
	color: var(--dim);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.pane-acts {
	display: flex;
	gap: 6px;
	flex: none;
}

.act {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	min-height: 32px;
	padding: 0 10px;
	border: 1px solid var(--line-2);
	border-radius: var(--r-sm);
	background: var(--bg-2);
	color: var(--dim);
	font: 500 12px/1 var(--font-sans);
	cursor: pointer;
}

.act:hover {
	color: var(--fg-hi);
	border-color: color-mix(in oklab, var(--fg) 30%, var(--line));
}

.pane-empty {
	margin: 0;
	padding: 24px 16px;
	font: 400 13.5px/1.6 var(--font-sans);
	color: var(--mute);
}

.pane-body {
	overflow: auto;
	max-height: 420px;
}

.pane-body.tall {
	max-height: min(64vh, 760px);
	min-height: 320px;
}

.pane-body pre {
	margin: 0;
	padding: 14px 16px 14px 0;
	font: 400 12.5px/1.7 var(--font-mono);
	color: var(--fg);
	white-space: pre;
}

/* Each line ends with a real newline, so the wrapper must stay inline. */

/* A gutter drawn with the text so it scrolls horizontally with nothing to align. */
.ln {
	display: inline-block;
	width: 3.2em;
	padding-right: 1.2em;
	text-align: right;
	color: color-mix(in oklab, var(--mute) 60%, transparent);
	user-select: none;
}

@media (max-width: 860px) {
	.editor {
		grid-template-columns: minmax(0, 1fr);
	}

	.rail {
		flex-direction: row;
		align-items: center;
		gap: 10px;
		border-right: 0;
		border-bottom: 1px solid var(--line);
		overflow-x: auto;
	}

	.rail-tabs {
		flex-direction: row;
		gap: 2px;
	}

	.rail-tab {
		flex: none;
	}

	.rail-foot {
		flex: none;
		padding-top: 0;
		padding-left: 10px;
		border-top: 0;
		border-left: 1px solid var(--line);
	}
}

@media (max-width: 640px) {
	.pane-body pre {
		padding: 12px 12px 12px 0;
		font-size: 11.5px;
	}

	.ln {
		width: 2.6em;
		padding-right: 0.9em;
	}

	.pane-body.tall {
		max-height: 56vh;
		min-height: 220px;
	}
}
</style>
