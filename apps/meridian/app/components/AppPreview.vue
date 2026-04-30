<script setup lang="ts">
import { ref } from 'vue'
import {
  Search,
  Check,
  Square,
  Box,
  Circle,
  Disc,
  Plus,
  FileText,
  ChevronRight,
  Clock,
  CheckCircle2,
  Database,
} from '@lucide/vue'

type SideItem = { id: string; label: string; icon: any }

const gettingStarted: SideItem[] = [
  { id: 'quickstart', label: 'Quickstart', icon: Check },
  { id: 'install', label: 'Installation', icon: Square },
  { id: 'config', label: 'Configuration', icon: Box },
  { id: 'migration', label: 'Migration', icon: Circle },
]

const projects: SideItem[] = [
  { id: 'divinemc', label: 'DivineMC', icon: Box },
  { id: 'quark', label: 'Quark', icon: Disc },
  { id: 'ndaily', label: 'NDailyRewards', icon: Plus },
  { id: 'helix', label: 'Helix', icon: Square },
]

const refs: SideItem[] = [
  { id: 'api', label: 'API', icon: FileText },
  { id: 'plugins', label: 'Plugins', icon: Circle },
  { id: 'maven', label: 'Maven', icon: Database },
]

const activeSide = ref('quickstart')

const onPage = [
  'Getting started',
  'Download a build',
  'Configuration',
  'Plugins',
  'First boot',
]
const activePage = ref(onPage[0])
</script>

<template>
  <div class="preview-wrap">
    <div class="preview">
      <!-- Window header -->
      <div class="pv-hd">
        <div class="dots"><i /><i /><i /></div>
        <div class="url">
          <Search :size="12" :stroke-width="1.6" />
          <span>Search docs, projects, plugins...</span>
          <span class="esc">ESC</span>
        </div>
      </div>

      <div class="pv-body">
        <!-- Left sidebar -->
        <aside class="pv-side">
          <h5>Getting Started</h5>
          <ul>
            <li
              v-for="i in gettingStarted"
              :key="i.id"
              :class="{ active: activeSide === i.id }"
              @click="activeSide = i.id"
            >
              <component :is="i.icon" class="ic" :size="14" :stroke-width="1.6" />
              {{ i.label }}
            </li>
          </ul>

          <h5>Projects</h5>
          <ul>
            <li
              v-for="i in projects"
              :key="i.id"
              :class="{ active: activeSide === i.id }"
              @click="activeSide = i.id"
            >
              <component :is="i.icon" class="ic" :size="14" :stroke-width="1.6" />
              {{ i.label }}
            </li>
          </ul>

          <h5>References</h5>
          <ul>
            <li
              v-for="i in refs"
              :key="i.id"
              :class="{ active: activeSide === i.id }"
              @click="activeSide = i.id"
            >
              <component :is="i.icon" class="ic" :size="14" :stroke-width="1.6" />
              {{ i.label }}
            </li>
          </ul>
        </aside>

        <!-- Main results -->
        <main class="pv-main">
          <div class="pv-search">
            <Search :size="14" :stroke-width="1.6" />
            <span class="q">
              How do I install DivineMC<span class="cursor" />
            </span>
            <span class="esc">ESC</span>
          </div>

          <div class="pv-result">
            <div class="ic-wrap">
              <Clock :size="14" :stroke-width="1.6" />
            </div>
            <div style="flex: 1">
              <h6>Can you tell me about DivineMC's optimizations?</h6>
              <p>Use AI to find answers to your questions about server performance.</p>
            </div>
            <div class="arr">
              <ChevronRight :size="14" :stroke-width="1.6" />
            </div>
          </div>

          <div class="pv-section-label">Components &gt; Server</div>

          <div class="pv-result">
            <div style="flex: 1">
              <h6>Async chunk loading</h6>
              <p>Move chunk generation off the main thread for smoother world streaming on busy servers.</p>
            </div>
          </div>

          <div class="pv-result">
            <div style="flex: 1">
              <h6>Getting started with Quark</h6>
              <p>Quark is the runtime dependency manager that keeps your plugin jars lightweight and conflict-free.</p>
            </div>
          </div>

          <div class="pv-result featured">
            <div class="ic-wrap">
              <CheckCircle2 :size="14" :stroke-width="1.6" />
            </div>
            <div style="flex: 1">
              <h6>
                <span class="tag">RUN</span>Generate optimized server flags
              </h6>
              <p>Output JVM flags tailored to your hardware and player count.</p>
            </div>
          </div>
        </main>

        <!-- Right "On this page" -->
        <aside class="pv-side-r">
          <h5>On this page</h5>
          <ul>
            <li
              v-for="p in onPage"
              :key="p"
              :class="{ active: activePage === p }"
              @click="activePage = p"
            >
              {{ p }}
            </li>
          </ul>
        </aside>
      </div>
    </div>
  </div>
</template>
