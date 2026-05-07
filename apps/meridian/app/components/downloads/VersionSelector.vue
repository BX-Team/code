<script setup lang="ts">
import { Button } from '@bx-team/ui';
import { AlertTriangle, ChevronDown, FlaskConical, XCircle } from '@lucide/vue';
import { onClickOutside } from '@vueuse/core';
import { ref } from 'vue';
import type { VersionWithBuilds } from '@/lib/atlas';

const props = defineProps<{
  versions: string[];
  selectedVersion: string;
  versionsMetadata?: VersionWithBuilds[];
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
  return props.versionsMetadata?.find(m => m.version.id === v)?.version.support.status;
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
					<span v-else-if="statusOf(selectedVersion) === 'DEPRECATED'" class="badge badge-warn">Deprecated</span>
					<span v-else-if="statusOf(selectedVersion) === 'UNSUPPORTED'" class="badge badge-err">Unsupported</span>
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
						<span v-else-if="statusOf(v) === 'DEPRECATED'" class="badge badge-warn">
							<AlertTriangle :size="11" :stroke-width="1.8" /> Deprecated
						</span>
						<span v-else-if="statusOf(v) === 'UNSUPPORTED'" class="badge badge-err">
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
.vs-head label { font-size: 13px; font-weight: 500; color: var(--dim); }

.toggle-exp {
	color: oklch(0.78 0.13 200);
	background: oklch(0.6 0.13 200 / .1);
	border: 1px solid oklch(0.6 0.13 200 / .2);
}
.toggle-exp:hover { background: oklch(0.6 0.13 200 / .18); }
.toggle-exp.on { background: oklch(0.6 0.13 200 / .22); border-color: oklch(0.6 0.13 200 / .35); }

.vs-dropdown {
	position: relative;
	max-width: 320px;
}

.trigger {
	width: 100%;
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 10px 14px;
	background: var(--bg-2);
	border: 1px solid var(--line-2);
	border-radius: 8px;
	color: var(--fg-hi);
	cursor: pointer;
	transition: border-color .15s, background .15s;
	font-family: inherit;
}
.trigger:hover,
.trigger.open {
	border-color: var(--brand);
	background: var(--bg-3);
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
	border-radius: 10px;
	overflow: hidden;
	z-index: 50;
	box-shadow: 0 8px 32px -8px rgba(0, 0, 0, 0.6);
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
.menu-item.selected { color: var(--fg-hi); background: oklch(0.2 0.01 240); }

.check { font-size: 12px; color: var(--brand); }

.badge {
	display: inline-flex;
	align-items: center;
	gap: 3px;
	padding: 2px 6px;
	border-radius: 4px;
	border: 1px solid;
	font-size: 11px;
	font-weight: 500;
}
.badge-exp  { background: oklch(0.6 0.13 200 / .12); color: oklch(0.78 0.13 200); border-color: oklch(0.6 0.13 200 / .25); }
.badge-warn { background: oklch(0.62 0.14 75 / .12);  color: oklch(0.82 0.14 75);  border-color: oklch(0.62 0.14 75 / .25); }
.badge-err  { background: oklch(0.65 0.21 25 / .12);  color: oklch(0.78 0.21 25);  border-color: oklch(0.65 0.21 25 / .25); }
</style>
