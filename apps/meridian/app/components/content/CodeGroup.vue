<script setup lang="ts">
import { cloneVNode, defineComponent, type VNode } from 'vue';

const ChildPanel = defineComponent({
  props: { vnode: { type: Object, required: true } },
  render() {
    return cloneVNode(this.vnode as VNode);
  },
});

const slots = useSlots();
const active = ref(0);
const copied = ref(false);
const bodyRef = ref<HTMLElement | null>(null);
const panelRefs = ref<(HTMLElement | null)[]>([]);

const children = computed(() => {
  const vnodes = slots.default?.() || [];
  return vnodes.filter(vn => vn && typeof vn.type !== 'symbol');
});

const tabs = computed(() =>
  children.value.map((vn, i) => ({
    label: (vn.props?.filename as string) || `Tab ${i + 1}`,
  })),
);

async function copy() {
  const el = panelRefs.value[active.value]?.querySelector('.shiki, pre');
  const text = el?.textContent || '';
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    copied.value = true;
    setTimeout(() => (copied.value = false), 1400);
  } catch {
    /* no-op */
  }
}
</script>

<template>
	<div class="code-block">
		<div class="cb-hd">
			<div class="cb-tabs" role="tablist">
				<button
					v-for="(tab, i) in tabs"
					:key="i"
					role="tab"
					:aria-selected="i === active"
					class="cb-tab"
					:class="{ active: i === active }"
					@click="active = i"
				>{{ tab.label }}</button>
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
		<div ref="bodyRef" class="cb-body">
			<div
				v-for="(child, i) in children"
				:key="i"
				v-show="i === active"
				:ref="(el) => { panelRefs[i] = el as HTMLElement }"
			>
				<ChildPanel :vnode="child" />
			</div>
		</div>
	</div>
</template>

<style scoped>
.code-block {
	position: relative;
	background: var(--bg-deep);
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

.cb-body :deep(pre) {
	margin: 0;
	padding: 16px 18px;
	font: 400 13px/1.65 var(--font-mono);
	color: var(--fg);
	background: transparent !important;
	white-space: pre;
	overflow-x: auto;
}

.cb-body :deep(.shiki) {
	background: transparent !important;
}

.cb-body :deep(code) {
	font: inherit;
	background: transparent;
}
</style>
