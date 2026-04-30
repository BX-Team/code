<script setup lang="ts">
import { Download, Clock, Package, GitCommit, ArrowRight } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import type { ProjectGroup, ProjectsResponse, Build } from '@/lib/atlas'
import { formatFileSize, getChannelColor } from '@/lib/atlas'

const { data: projects } = await useAsyncData<ProjectGroup[]>(
  'downloads:projects',
  async () => {
    const { projects: list } = await $fetch<ProjectsResponse>('/api/v2/projects')
    return Promise.all(
      list.map(async (pg) => {
        if (!pg.project.latestVersion) return pg
        const latestBuild = await $fetch<Build>(
          `/api/v2/projects/${pg.project.id}/versions/${pg.project.latestVersion}/builds/latest`,
        ).catch(() => undefined)
        return { ...pg, latestBuild }
      }),
    )
  },
  { default: () => [] as ProjectGroup[] },
)

useHead({
  title: 'Downloads | BX Team',
  meta: [{ name: 'description', content: 'Download the latest builds of our Minecraft server software.' }],
})
</script>

<template>
  <PageShell>
    <div class="page-wrap">
      <header class="page-head">
        <h1>Downloads</h1>
        <p>Select software you want to download</p>
      </header>

      <div v-if="projects.length" class="project-list">
        <article v-for="p in projects" :key="p.project.id" class="proj-card">
          <header class="proj-head">
            <NuxtLink :to="`/downloads/${p.project.id}`" class="proj-title">
              <h2>{{ p.project.name }}</h2>
            </NuxtLink>
            <p>{{ p.project.description || 'No description available.' }}</p>
          </header>

          <div v-if="p.latestBuild" class="stats">
            <div class="stat">
              <div class="stat-label">Latest Build</div>
              <div class="stat-val">#{{ p.latestBuild.id }}</div>
            </div>
            <div class="stat">
              <div class="stat-label">Channel</div>
              <span class="ch-pill" :class="getChannelColor(p.latestBuild.channel)">{{ p.latestBuild.channel }}</span>
            </div>
            <div class="stat">
              <div class="stat-label">Size</div>
              <div class="stat-val with-icon">
                <Package :size="12" :stroke-width="1.8" />
                {{ formatFileSize(p.latestBuild.downloads.application.size) }}
              </div>
            </div>
            <div class="stat">
              <div class="stat-label">Updated</div>
              <div class="stat-val with-icon">
                <Clock :size="12" :stroke-width="1.8" />
                {{ new Date(p.latestBuild.time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }}
              </div>
            </div>
          </div>

          <div v-if="p.latestBuild?.commits?.length" class="commits">
            <div class="commits-head">
              <GitCommit :size="14" :stroke-width="1.7" />
              <h4>Recent Changes</h4>
            </div>
            <ul>
              <li v-for="c in p.latestBuild.commits.slice(0, 3)" :key="c.sha">
                <a
                  :href="`https://github.com/BX-Team/${p.project.name}/commit/${c.sha}`"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="sha"
                >{{ c.sha.substring(0, 7) }}</a>
                <span>{{ c.message }}</span>
              </li>
            </ul>
          </div>

          <footer class="proj-foot">
            <Button v-if="p.latestBuild" as="a" :href="p.latestBuild.downloads.application.url" target="_blank" rel="noopener noreferrer" variant="default">
              <Download :size="16" :stroke-width="1.7" />
              Download Latest
            </Button>
            <Button as-child variant="ghost">
              <NuxtLink :to="`/downloads/${p.project.id}`">
                <ArrowRight :size="16" :stroke-width="1.7" />
                All Builds
              </NuxtLink>
            </Button>
          </footer>
        </article>
      </div>

      <div v-else class="empty">
        <Download :size="36" :stroke-width="1.5" />
        <h3>No Projects Available</h3>
        <p>There are currently no projects available for download.</p>
      </div>
    </div>
  </PageShell>
</template>

<style scoped>
.page-wrap { max-width: 1100px; margin: 0 auto; padding: 90px 24px 80px; }
.page-head { text-align: center; margin-bottom: 48px; }
.page-head h1 {
  font-size: clamp(36px, 5vw, 52px);
  font-weight: 700;
  letter-spacing: -0.025em;
  color: var(--fg-hi);
  margin: 0 0 12px;
}
.page-head p { color: var(--dim); font-size: 17px; margin: 0; }

.project-list { display: flex; flex-direction: column; gap: 18px; max-width: 880px; margin: 0 auto; }

.proj-card {
  border: 1px solid var(--line);
  border-radius: 14px;
  overflow: hidden;
  background: oklch(0.16 0.006 240 / .55);
  backdrop-filter: blur(8px);
  transition: border-color .15s;
}
.proj-card:hover { border-color: var(--line-2); }

.proj-head { padding: 22px 24px 14px; }
.proj-title { display: inline-block; }
.proj-title h2 {
  font-size: 22px;
  font-weight: 700;
  color: var(--fg-hi);
  margin: 0 0 6px;
  transition: color .15s;
}
.proj-title:hover h2 { color: var(--brand); }
.proj-head p { margin: 0; color: var(--mute); font-size: 13.5px; line-height: 1.55; }

.stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  padding: 0 24px 16px;
}
@media (max-width: 640px) { .stats { grid-template-columns: repeat(2, 1fr); } }
.stat {
  background: oklch(0.20 0.007 240 / .55);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 10px 12px;
}
.stat-label { font-size: 11px; color: var(--mute); margin-bottom: 4px; }
.stat-val { font-size: 14px; font-weight: 700; color: var(--fg-hi); }
.stat-val.with-icon { display: flex; align-items: center; gap: 5px; }

.commits { padding: 14px 24px; border-top: 1px solid var(--line); }
.commits-head { display: flex; align-items: center; gap: 8px; color: var(--mute); margin-bottom: 10px; }
.commits-head h4 { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .08em; margin: 0; }
.commits ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
.commits li { display: flex; gap: 8px; font-size: 13px; color: var(--dim); align-items: baseline; }
.sha {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--brand);
  flex-shrink: 0;
  transition: opacity .15s;
}
.sha:hover { opacity: .8; }

.proj-foot { padding: 14px 24px 20px; border-top: 1px solid var(--line); display: flex; gap: 10px; flex-wrap: wrap; }

/* Channel pill colors */
.ch-pill {
  display: inline-block;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 600;
  font-family: var(--font-mono);
  border-radius: 4px;
  border: 1px solid;
}
.channel-stable, .ch-pill.channel-stable { background: oklch(0.6 0.13 158 / .15); color: oklch(0.78 0.13 158); border-color: oklch(0.6 0.13 158 / .3); }
.channel-beta, .ch-pill.channel-beta { background: oklch(0.6 0.13 200 / .15); color: oklch(0.78 0.13 200); border-color: oklch(0.6 0.13 200 / .3); }
.channel-alpha, .ch-pill.channel-alpha { background: oklch(0.62 0.14 75 / .15); color: oklch(0.82 0.14 75); border-color: oklch(0.62 0.14 75 / .3); }
.channel-experimental, .ch-pill.channel-experimental { background: oklch(0.6 0.13 295 / .15); color: oklch(0.78 0.13 295); border-color: oklch(0.6 0.13 295 / .3); }
.channel-default, .ch-pill.channel-default { background: var(--bg-2); color: var(--dim); border-color: var(--line-2); }

.empty {
  display: grid; place-items: center;
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 64px 24px;
  background: oklch(0.16 0.006 240 / .5);
  text-align: center;
  color: var(--mute);
}
.empty h3 { margin: 14px 0 6px; color: var(--fg-hi); font-size: 18px; }
.empty p { margin: 0; }
</style>
