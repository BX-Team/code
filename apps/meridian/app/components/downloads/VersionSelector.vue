<script setup lang="ts">
import { Button } from '@bx-team/ui';
import { AlertTriangle, ChevronDown, FlaskConical, XCircle } from '@lucide/vue';
import { onClickOutside } from '@vueuse/core';
import { ref } from 'vue';
import type { VersionSummary } from '@/lib/builds';

const props = defineProps<{
  versions: string[];
  selectedVersion: string;
  versionsMetadata?: VersionSummary[];
  experimentalVersion?: string;
  showExperimental?: boolean;
}>();

const emit = defineEmits<{
  'update:selectedVersion': [v: string];
  'toggle-experimental': [v: boolean];
}>();

const open = ref(false);
const dropdownRef = ref<HTMLElement>();
onClickOutside(dropdownRef, () => {
  open.value = false;
});

function statusOf(v: string) {
  return props.versionsMetadata?.find(m => m.version === v)?.support;
}

function pick(v: string) {
  emit('update:selectedVersion', v);
  open.value = false;
}
</script>

<template>
	<div class="vs">
		<div class="vs-head">
			<label>Minecraft Version</label>
			<Button
				v-if="experimentalVersion"
				variant="ghost"
				size="sm"
				:class="['toggle-exp', { on: showExperimental }]"
				@click="emit('toggle-experimental', !showExperimental)"
			>
				<FlaskConical :size="14" :stroke-width="1.7" />
				Toggle Experimental
			</Button>
		</div>

		<div ref="dropdownRef" class="vs-dropdown">
			<button type="button" class="trigger" :class="{ open }" @click="open = !open">
				<span class="val">
					<strong>{{ selectedVersion }}</strong>
					<span v-if="selectedVersion === experimentalVersion" class="badge badge-exp">
						<FlaskConical :size="11" :stroke-width="1.8" /> Experimental
					</span>
					<span v-else-if="statusOf(selectedVersion) === 'deprecated'" class="badge badge-warn">Deprecated</span>
					<span v-else-if="statusOf(selectedVersion) === 'unsupported'" class="badge badge-err">Unsupported</span>
				</span>
				<ChevronDown :size="14" :stroke-width="1.7" class="caret" :class="{ flipped: open }" />
			</button>

			<div v-show="open" class="panel">
				<button
					v-for="v in versions"
					:key="v"
					type="button"
					class="menu-item"
					:class="{ selected: v === selectedVersion }"
					@click="pick(v)"
				>
					<span class="val">
						<strong>{{ v }}</strong>
						<span v-if="v === experimentalVersion" class="badge badge-exp">
							<FlaskConical :size="11" :stroke-width="1.8" /> Experimental
						</span>
						<span v-else-if="statusOf(v) === 'deprecated'" class="badge badge-warn">
							<AlertTriangle :size="11" :stroke-width="1.8" /> Deprecated
						</span>
						<span v-else-if="statusOf(v) === 'unsupported'" class="badge badge-err">
							<XCircle :size="11" :stroke-width="1.8" /> Unsupported
						</span>
					</span>
					<span v-if="v === selectedVersion" class="check">✓</span>
				</button>
			</div>
		</div>
	</div>
</template>

<style scoped>
.vs { margin-bottom: 22px; }

.vs-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 8px;
	gap: 12px;
	flex-wrap: wrap;
}
.vs-head label { font: 500 11px/1.4 var(--font-mono); letter-spacing: 0.1em; text-transform: uppercase; color: var(--mute); }

.toggle-exp {
	color: var(--dim);
	border: 1px solid var(--edge);
}
.toggle-exp:hover { border-color: var(--fg); }
.toggle-exp.on { color: var(--ch-experimental); border-color: var(--ch-experimental); background: var(--surface-2); }

.vs-dropdown {
	position: relative;
	max-width: 320px;
}

.trigger {
	width: 100%;
	display: flex;
	align-items: center;
	justify-content: space-between;
	height: 40px;
	padding: 0 var(--s-3);
	background: var(--surface-3);
	border: 1px solid var(--edge);
	border-radius: var(--r-2);
	color: var(--fg);
	cursor: pointer;
	transition: border-color .15s, background .15s;
	font-family: inherit;
}
.trigger:hover,
.trigger.open {
	border-color: var(--fg);
}

.val {
	display: inline-flex;
	align-items: center;
	gap: 8px;
	font-size: 14px;
}

.caret { transition: transform .2s; color: var(--mute); }
.caret.flipped { transform: rotate(180deg); }

.panel {
	position: absolute;
	top: calc(100% + 6px);
	left: 0;
	right: 0;
	background: var(--bg-1);
	border: 1px solid var(--line-2);
	border-radius: var(--r-1);
	overflow: hidden;
	z-index: 50;
	box-shadow: var(--shadow-panel);
	max-height: 280px;
	overflow-y: auto;
}

.menu-item {
	width: 100%;
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 9px 14px;
	background: none;
	border: none;
	cursor: pointer;
	color: var(--dim);
	font-family: inherit;
	font-size: 14px;
	text-align: left;
	transition: background .12s, color .12s;
}
.menu-item:hover { background: var(--bg-2); color: var(--fg-hi); }
.menu-item.selected { color: var(--fg-hi); background: var(--hover-2); }

.check { font-size: 12px; color: var(--accent); }

.badge {
	display: inline-flex;
	align-items: center;
	gap: 3px;
	padding: 2px 6px;
	border-radius: var(--r-1);
	border: 1px solid;
	font-size: 11px;
	font-weight: 500;
}
.badge-exp  { background: color-mix(in oklab, var(--ch-experimental) 12%, transparent); color: var(--ch-experimental); border-color: color-mix(in oklab, var(--ch-experimental) 25%, transparent); }
.badge-warn { background: color-mix(in oklab, var(--warn) 12%, transparent);  color: var(--warn);  border-color: color-mix(in oklab, var(--warn) 25%, transparent); }
.badge-err  { background: color-mix(in oklab, var(--err) 12%, transparent);  color: var(--err);  border-color: color-mix(in oklab, var(--err) 25%, transparent); }
</style>
