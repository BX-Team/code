<script setup lang="ts">
import { ref } from 'vue'
import { AlertTriangle, Check, ChevronDown, FlaskConical, XCircle } from 'lucide-vue-next'
import type { VersionWithBuilds } from '@/lib/atlas'

const props = defineProps<{
  versions: string[]
  selectedVersion: string
  versionsMetadata?: VersionWithBuilds[]
  experimentalVersion?: string
  showExperimental?: boolean
}>()

const emit = defineEmits<{
  'update:selectedVersion': [v: string]
  'toggle-experimental': [v: boolean]
}>()

const open = ref(false)

function statusOf(v: string) {
  return props.versionsMetadata?.find(m => m.version.id === v)?.version.support.status
}

function pick(v: string) {
  emit('update:selectedVersion', v)
  open.value = false
}
</script>

<template>
  <div class="vs">
    <div class="vs-head">
      <label>Minecraft Version</label>
      <button
        v-if="experimentalVersion"
        type="button"
        :class="['toggle-exp', { on: showExperimental }]"
        @click="emit('toggle-experimental', !showExperimental)"
      >
        <FlaskConical :size="14" :stroke-width="1.7" />
        Toggle Experimental Builds
      </button>
    </div>

    <div class="dropdown">
      <button type="button" class="trigger" @click="open = !open">
        <span class="val">
          <strong>{{ selectedVersion }}</strong>
          <span v-if="selectedVersion === experimentalVersion" class="badge badge-exp">
            <FlaskConical :size="11" :stroke-width="1.8" /> Experimental
          </span>
          <span v-else-if="statusOf(selectedVersion) === 'DEPRECATED'" class="badge badge-warn">Deprecated</span>
          <span v-else-if="statusOf(selectedVersion) === 'UNSUPPORTED'" class="badge badge-err">Unsupported</span>
        </span>
        <ChevronDown :size="14" :stroke-width="1.7" :class="['caret', { open }]" />
      </button>
      <div v-if="open" class="menu">
        <button
          v-for="v in versions"
          :key="v"
          type="button"
          :class="['menu-item', { active: v === selectedVersion }]"
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
          <Check v-if="v === selectedVersion" :size="14" :stroke-width="2" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.vs { margin-bottom: 22px; }
.vs-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; gap: 12px; flex-wrap: wrap; }
.vs-head label { font-size: 13px; font-weight: 500; color: var(--dim); }
.toggle-exp {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 12px; border-radius: 6px;
  font-size: 12.5px; font-weight: 500;
  color: oklch(0.78 0.13 200);
  background: oklch(0.6 0.13 200 / .1);
  border: 1px solid oklch(0.6 0.13 200 / .2);
  cursor: pointer;
  transition: background .15s;
}
.toggle-exp:hover { background: oklch(0.6 0.13 200 / .18); }
.toggle-exp.on { background: oklch(0.6 0.13 200 / .22); border-color: oklch(0.6 0.13 200 / .35); }

.dropdown { position: relative; max-width: 320px; }
.trigger {
  width: 100%;
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 14px;
  background: var(--bg-2);
  border: 1px solid var(--line-2);
  border-radius: 8px;
  color: var(--fg-hi);
  cursor: pointer;
  transition: border-color .15s;
}
.trigger:hover { border-color: var(--mute); }
.val { display: inline-flex; align-items: center; gap: 8px; font-size: 14px; }
.caret { transition: transform .15s; }
.caret.open { transform: rotate(180deg); }

.menu {
  position: absolute; top: calc(100% + 6px); left: 0; right: 0;
  max-height: 320px; overflow-y: auto;
  background: var(--bg-1);
  border: 1px solid var(--line-2);
  border-radius: 8px;
  padding: 4px;
  z-index: 20;
  box-shadow: 0 18px 40px -12px rgba(0,0,0,.55);
}
.menu-item {
  width: 100%;
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 12px; border-radius: 6px;
  background: none; border: 0;
  color: var(--dim);
  font-size: 14px;
  cursor: pointer;
  transition: background .12s, color .12s;
}
.menu-item:hover { background: rgba(255,255,255,.04); color: var(--fg-hi); }
.menu-item.active { background: rgba(255,255,255,.06); color: var(--fg-hi); }

.badge {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 2px 6px; border-radius: 4px;
  font-size: 11px; font-weight: 500;
  border: 1px solid transparent;
}
.badge-exp { background: oklch(0.6 0.13 200 / .12); color: oklch(0.78 0.13 200); border-color: oklch(0.6 0.13 200 / .25); }
.badge-warn { background: oklch(0.62 0.14 75 / .12); color: oklch(0.82 0.14 75); }
.badge-err { background: oklch(0.65 0.21 25 / .12); color: oklch(0.78 0.21 25); }
</style>
