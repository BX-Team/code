<script setup lang="ts">
import { Calendar, Download, ExternalLink, GitCommit, Package } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { type Build, formatDate, formatFileSize, getChannelColor } from '@/lib/atlas'

const props = defineProps<{
  build: Build
  projectName: string
  version: string
}>()

function dl() {
  window.open(props.build.downloads.application.url, '_blank')
}
</script>

<template>
  <div class="card">
    <div class="card-head">
      <div>
        <div class="title-row">
          <h3>Build #{{ build.id }}</h3>
          <span class="ch-pill" :class="getChannelColor(build.channel)">{{ build.channel }}</span>
        </div>
        <div class="meta">
          <div><Calendar :size="14" :stroke-width="1.7" /><span>{{ formatDate(build.time) }}</span></div>
          <div><Package :size="14" :stroke-width="1.7" /><span>{{ formatFileSize(build.downloads.application.size) }}</span></div>
        </div>
      </div>
      <Button variant="default" @click="dl">
        <Download :size="16" :stroke-width="1.7" /> Download
      </Button>
    </div>

    <div v-if="build.commits?.length" class="section">
      <h4><GitCommit :size="14" :stroke-width="1.7" /> Commits:</h4>
      <ul>
        <li v-for="c in build.commits" :key="c.sha">
          <a :href="`https://github.com/BX-Team/${projectName}/commit/${c.sha}`" target="_blank" rel="noopener noreferrer" class="sha-link">
            <code>{{ c.sha.substring(0, 7) }}</code>
            <ExternalLink :size="11" :stroke-width="1.8" />
          </a>
          <span>{{ c.message }}</span>
        </li>
      </ul>
    </div>

    <div class="section file-info">
      <div><span>File:</span><code>{{ build.downloads.application.name }}</code></div>
      <div><span>SHA-256:</span><code>{{ build.downloads.application.checksums.sha256.substring(0, 16) }}…</code></div>
    </div>
  </div>
</template>

<style scoped>
.card {
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 20px;
  background: oklch(0.16 0.006 240 / .55);
  transition: border-color .15s;
}
.card:hover { border-color: var(--line-2); }
.card-head { display: flex; gap: 14px; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; }
.title-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; flex-wrap: wrap; }
.title-row h3 { margin: 0; font-size: 16px; font-weight: 600; color: var(--fg-hi); }
.meta { display: flex; gap: 16px; flex-wrap: wrap; color: var(--mute); font-size: 13px; }
.meta div { display: inline-flex; align-items: center; gap: 6px; }

.ch-pill {
  padding: 2px 8px;
  font-size: 11px; font-weight: 600;
  font-family: var(--font-mono);
  border-radius: 4px; border: 1px solid;
}
.channel-stable { background: oklch(0.6 0.13 158 / .15); color: oklch(0.78 0.13 158); border-color: oklch(0.6 0.13 158 / .3); }
.channel-beta { background: oklch(0.6 0.13 200 / .15); color: oklch(0.78 0.13 200); border-color: oklch(0.6 0.13 200 / .3); }
.channel-alpha { background: oklch(0.62 0.14 75 / .15); color: oklch(0.82 0.14 75); border-color: oklch(0.62 0.14 75 / .3); }
.channel-experimental { background: oklch(0.6 0.13 295 / .15); color: oklch(0.78 0.13 295); border-color: oklch(0.6 0.13 295 / .3); }
.channel-default { background: var(--bg-2); color: var(--dim); border-color: var(--line-2); }

.section { margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--line); }
.section h4 { display: flex; align-items: center; gap: 6px; margin: 0 0 10px; font-size: 13px; color: var(--dim); font-weight: 500; }
.section ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; }
.section li { font-size: 13px; color: var(--mute); display: flex; gap: 8px; align-items: baseline; flex-wrap: wrap; }

.sha-link {
  display: inline-flex; align-items: center; gap: 4px;
  background: var(--bg-2); padding: 2px 6px; border-radius: 4px;
  font-family: var(--font-mono); font-size: 11px;
  color: var(--dim);
  transition: background .15s, color .15s;
}
.sha-link:hover { background: var(--bg-3); color: var(--fg-hi); }

.file-info { font-size: 12px; color: var(--mute); display: flex; flex-direction: column; gap: 4px; }
.file-info div { display: flex; justify-content: space-between; gap: 12px; }
.file-info code { font-family: var(--font-mono); color: var(--dim); word-break: break-all; }
</style>
