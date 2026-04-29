<script setup lang="ts">
import { ref } from 'vue'
import {
  FileText,
  Download,
  Clock,
  Box,
  ListOrdered,
  Users,
} from 'lucide-vue-next'

const tabs = [
  { id: 'docs', label: 'Documentation', icon: FileText },
  { id: 'downloads', label: 'Downloads', icon: Download },
  { id: 'status', label: 'Status', icon: Clock },
  { id: 'plugins', label: 'Plugins', icon: Box },
  { id: 'changelog', label: 'Changelog', icon: ListOrdered },
  { id: 'team', label: 'Team', icon: Users },
] as const

const active = ref<(typeof tabs)[number]['id']>('docs')
</script>

<template>
  <div class="tabs" role="tablist">
    <button
      v-for="t in tabs"
      :key="t.id"
      type="button"
      role="tab"
      :aria-selected="active === t.id"
      :class="['tab', { active: active === t.id }]"
      @click="active = t.id"
    >
      <component :is="t.icon" :size="14" :stroke-width="1.6" />
      {{ t.label }}
    </button>
  </div>
</template>
