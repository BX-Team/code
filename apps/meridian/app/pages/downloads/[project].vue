<script setup lang="ts">
import { useRoute } from 'vue-router'
import { ArrowLeft, BookOpen, Download, Info } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import AtlasBuildsList from '@/components/downloads/AtlasBuildsList.vue'
import type { Build, Project, VersionWithBuilds } from '@/lib/atlas'
import { formatFileSize, getAllVersions } from '@/lib/atlas'

const route = useRoute()
const projectId = String(route.params.project)

const { data } = await useAsyncData(`project:${projectId}`, async () => {
  const projectResp = await $fetch<{ project: Project; version_groups: Record<string, string[]> }>(
    `/api/v2/projects/${projectId}`,
  ).catch(() => null)

  if (!projectResp?.project) {
    throw createError({ statusCode: 404, statusMessage: 'Project not found', fatal: true })
  }

  const { project, version_groups } = projectResp

  const [versionsMetadata, latestBuild, initialBuilds] = await Promise.all([
    $fetch<VersionWithBuilds[]>(`/api/v2/projects/${projectId}/versions`).catch(() => [] as VersionWithBuilds[]),
    project.latestVersion
      ? $fetch<Build>(`/api/v2/projects/${projectId}/versions/${project.latestVersion}/builds/latest`).catch(() => null)
      : Promise.resolve(null),
    project.latestVersion
      ? $fetch<Build[]>(`/api/v2/projects/${projectId}/versions/${project.latestVersion}/builds`).catch(() => [] as Build[])
      : Promise.resolve([] as Build[]),
  ])

  return { project, version_groups, versionsMetadata, latestBuild, initialBuilds }
})

if (!data.value) throw createError({ statusCode: 500, statusMessage: 'Failed to load project', fatal: true })

const project = computed(() => data.value!.project)
const latestBuild = computed(() => data.value!.latestBuild)
const allVersions = computed(() => getAllVersions(data.value!.version_groups))
const versionsMetadata = computed(() => data.value!.versionsMetadata)
const initialBuilds = computed(() => data.value!.initialBuilds)

useHead({
  title: computed(() => `${project.value.name} Downloads | BX Team`),
  meta: [{ name: 'description', content: computed(() => `Download the latest ${project.value.name} builds.`) }],
})

const githubUrl = computed(() => `https://github.com/BX-Team/${project.value.name}`)
const docsUrl = computed(() => `/docs/${projectId}`)
</script>

<template>
  <PageShell>
    <div class="page-wrap">
      <div class="back-row">
        <Button as-child variant="ghost" size="sm">
          <NuxtLink to="/downloads">
            <ArrowLeft :size="14" :stroke-width="1.8" /> Back to Downloads
          </NuxtLink>
        </Button>
      </div>

      <div class="hero-card">
        <div class="hero-main">
          <h1>{{ project.name }}</h1>
          <p class="hero-desc">Get the latest builds of {{ project.name }} for your Minecraft server</p>

          <div v-if="latestBuild" class="stats">
            <div class="stat">
              <div class="stat-label">Latest Build</div>
              <div class="stat-val">#{{ latestBuild.id }}</div>
            </div>
            <div class="stat">
              <div class="stat-label">Channel</div>
              <div class="stat-val brand-c">{{ latestBuild.channel }}</div>
            </div>
            <div class="stat">
              <div class="stat-label">File Size</div>
              <div class="stat-val">{{ formatFileSize(latestBuild.downloads.application.size) }}</div>
            </div>
            <div class="stat">
              <div class="stat-label">Updated</div>
              <div class="stat-val">{{ new Date(latestBuild.time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }}</div>
            </div>
          </div>

          <div class="cta-row">
            <Button v-if="latestBuild" as="a" :href="latestBuild.downloads.application.url" target="_blank" rel="noopener noreferrer" variant="default" size="lg">
              <Download :size="18" :stroke-width="1.7" /> Download Latest Build
            </Button>
            <Button as-child variant="ghost" size="lg">
              <NuxtLink :to="docsUrl">
                <BookOpen :size="18" :stroke-width="1.7" /> Documentation
              </NuxtLink>
            </Button>
            <Button as="a" :href="githubUrl" target="_blank" rel="noopener noreferrer" variant="ghost" size="lg">
              <img src="~/assets/external/github.svg" width="18" height="18" alt="" aria-hidden="true" class="btn-icon" /> Source Code
            </Button>
          </div>
        </div>

        <aside v-if="latestBuild" class="info-side">
          <h3><Info :size="14" :stroke-width="1.7" /> Latest Build Info</h3>
          <div class="info-label">Build #{{ latestBuild.id }} Changes</div>
          <ul class="info-list">
            <li v-for="c in latestBuild.commits" :key="c.sha">
              <a :href="`${githubUrl}/commit/${c.sha}`" target="_blank" rel="noopener noreferrer" class="sha">{{ c.sha.substring(0, 7) }}</a>
              <p>{{ c.message }}</p>
            </li>
          </ul>
        </aside>
      </div>

      <section class="builds-section">
        <h2>All Builds</h2>
        <div class="panel">
          <AtlasBuildsList
            :project-id="projectId"
            :project-name="project.name"
            :initial-versions="allVersions"
            :default-version="project.latestVersion ?? ''"
            :experimental-version="project.experimentalVersion"
            :versions-metadata="versionsMetadata"
            :initial-builds="initialBuilds"
          />
        </div>
      </section>
    </div>
  </PageShell>
</template>

<style scoped>
.page-wrap { max-width: 1180px; margin: 0 auto; padding: 60px 24px 80px; }
.back-row { margin-bottom: 18px; }

.hero-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 28px;
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 32px;
  background: linear-gradient(180deg, oklch(0.16 0.006 240 / .65), oklch(0.14 0.006 240 / .55));
  backdrop-filter: blur(10px);
  margin-bottom: 32px;
}
@media (max-width: 920px) { .hero-card { grid-template-columns: 1fr; padding: 24px; } }

.hero-main h1 {
  font-size: clamp(32px, 4.5vw, 44px);
  font-weight: 700;
  color: var(--fg-hi);
  letter-spacing: -.02em;
  margin: 0 0 10px;
}
.hero-desc { color: var(--dim); font-size: 16px; margin: 0 0 24px; }

.stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 24px;
}
@media (max-width: 640px) { .stats { grid-template-columns: repeat(2, 1fr); } }
.stat {
  background: oklch(0.20 0.007 240 / .55);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 12px 14px;
}
.stat-label { font-size: 11px; color: var(--mute); margin-bottom: 4px; }
.stat-val { font-size: 16px; font-weight: 700; color: var(--fg-hi); }
.stat-val.brand-c { color: var(--brand); }

.cta-row { display: flex; gap: 10px; flex-wrap: wrap; }

.info-side {
  background: oklch(0.13 0.006 240 / .6);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 18px;
}
.info-side h3 {
  display: flex; align-items: center; gap: 6px;
  margin: 0 0 14px;
  font-size: 13px;
  color: var(--dim);
  font-weight: 500;
}
.info-label { font-size: 11px; color: var(--mute); margin-bottom: 10px; }
.info-list { list-style: none; padding: 0; margin: 0; max-height: 280px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; }
.info-list li { font-size: 12px; }
.info-list .sha { font-family: var(--font-mono); font-size: 11px; color: var(--brand); }
.info-list p { margin: 4px 0 0; color: var(--dim); }

.builds-section h2 {
  font-size: 22px; font-weight: 600;
  color: var(--fg-hi);
  margin: 0 0 18px;
}
.panel {
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 22px;
  background: oklch(0.16 0.006 240 / .5);
}
.btn-icon {
  filter: brightness(0) invert(1);
  opacity: 0.75;
}
</style>
