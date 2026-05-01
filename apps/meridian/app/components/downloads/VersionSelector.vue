<script setup lang="ts">
import { AlertTriangle, ChevronDown, FlaskConical, XCircle } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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

function statusOf(v: string) {
  return props.versionsMetadata?.find(m => m.version.id === v)?.version.support.status
}

function pick(v: string) {
  emit('update:selectedVersion', v)
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
        Toggle Experimental Builds
      </Button>
    </div>

    <DropdownMenu>
      <DropdownMenuTrigger as-child>
        <button type="button" class="trigger">
          <span class="val">
            <strong>{{ selectedVersion }}</strong>
            <Badge v-if="selectedVersion === experimentalVersion" class="badge badge-exp">
              <FlaskConical :size="11" :stroke-width="1.8" /> Experimental
            </Badge>
            <Badge v-else-if="statusOf(selectedVersion) === 'DEPRECATED'" class="badge badge-warn">Deprecated</Badge>
            <Badge v-else-if="statusOf(selectedVersion) === 'UNSUPPORTED'" class="badge badge-err">Unsupported</Badge>
          </span>
          <ChevronDown :size="14" :stroke-width="1.7" class="caret" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" class="dropdown-content">
        <DropdownMenuRadioGroup :model-value="selectedVersion" @update:model-value="pick">
          <DropdownMenuRadioItem
            v-for="v in versions"
            :key="v"
            :value="v"
            class="menu-item"
          >
            <span class="val">
              <strong>{{ v }}</strong>
              <Badge v-if="v === experimentalVersion" class="badge badge-exp">
                <FlaskConical :size="11" :stroke-width="1.8" /> Experimental
              </Badge>
              <Badge v-else-if="statusOf(v) === 'DEPRECATED'" class="badge badge-warn">
                <AlertTriangle :size="11" :stroke-width="1.8" /> Deprecated
              </Badge>
              <Badge v-else-if="statusOf(v) === 'UNSUPPORTED'" class="badge badge-err">
                <XCircle :size="11" :stroke-width="1.8" /> Unsupported
              </Badge>
            </span>
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</template>

<style scoped>
.vs { margin-bottom: 22px; }
.vs-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; gap: 12px; flex-wrap: wrap; }
.vs-head label { font-size: 13px; font-weight: 500; color: var(--dim); }

.toggle-exp {
  color: oklch(0.78 0.13 200);
  background: oklch(0.6 0.13 200 / .1);
  border: 1px solid oklch(0.6 0.13 200 / .2);
}
.toggle-exp:hover { background: oklch(0.6 0.13 200 / .18); color: oklch(0.78 0.13 200); }
.toggle-exp.on { background: oklch(0.6 0.13 200 / .22); border-color: oklch(0.6 0.13 200 / .35); }

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
  max-width: 320px;
}
.trigger:hover { border-color: var(--mute); }
.val { display: inline-flex; align-items: center; gap: 8px; font-size: 14px; }
.caret { transition: transform .15s; }

.dropdown-content { max-width: 320px; }

.menu-item { color: var(--dim); }

.badge {
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}
.badge-exp { background: oklch(0.6 0.13 200 / .12); color: oklch(0.78 0.13 200); border-color: oklch(0.6 0.13 200 / .25); }
.badge-warn { background: oklch(0.62 0.14 75 / .12); color: oklch(0.82 0.14 75); border-color: oklch(0.62 0.14 75 / .12); }
.badge-err { background: oklch(0.65 0.21 25 / .12); color: oklch(0.78 0.21 25); border-color: oklch(0.65 0.21 25 / .12); }
</style>
