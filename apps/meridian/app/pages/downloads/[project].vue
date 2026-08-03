<script setup lang="ts">
import { Button } from '@bx-team/ui';
import { ArrowLeft, BookOpen, Download, Info } from '@lucide/vue';
import { useRoute } from 'vue-router';
import AtlasBuildsList from '@/components/downloads/AtlasBuildsList.vue';
import { API_BASE } from '@/lib/api';
import type { Build, Project, VersionWithBuilds } from '@/lib/atlas';
import { formatFileSize, getAllVersions } from '@/lib/atlas';
import { GITHUB_URL } from '~/config/links';

const route = useRoute();
const projectId = String(route.params.project);
const queryVersion = computed(() => {
  const v = route.query.version;
  return typeof v === 'string' && v ? v : null;
});

const { data } = await useAsyncData(`project:${projectId}`, async () => {
  const projectResp = await $fetch<{ project: Project; version_groups: Record<string, string[]> }>(
    `${API_BASE}/atlas/projects/${projectId}`,
  ).catch(() => null);

  if (!projectResp?.project) {
    throw createError({ statusCode: 404, statusMessage: 'Project not found', fatal: true });
  }

  const { project, version_groups } = projectResp;

  const availableVersions = getAllVersions(version_groups);
  const requestedVersion =
    queryVersion.value && availableVersions.includes(queryVersion.value) ? queryVersion.value : null;
  const initialVersion = requestedVersion ?? project.latestVersion ?? '';

  const [versionsMetadata, latestBuild, initialBuilds] = await Promise.all([
    $fetch<VersionWithBuilds[]>(`${API_BASE}/atlas/projects/${projectId}/versions`).catch(
      () => [] as VersionWithBuilds[],
    ),
    project.latestVersion
      ? $fetch<Build>(`${API_BASE}/atlas/projects/${projectId}/versions/${project.latestVersion}/builds/latest`).catch(
          () => null,
        )
      : Promise.resolve(null),
    initialVersion
      ? $fetch<Build[]>(`${API_BASE}/atlas/projects/${projectId}/versions/${initialVersion}/builds`).catch(
          () => [] as Build[],
        )
      : Promise.resolve([] as Build[]),
  ]);

  return { project, version_groups, versionsMetadata, latestBuild, initialBuilds, initialVersion };
});

if (!data.value) throw createError({ statusCode: 500, statusMessage: 'Failed to load project', fatal: true });

const project = computed(() => data.value!.project);
const latestBuild = computed(() => data.value!.latestBuild);
const allVersions = computed(() => getAllVersions(data.value!.version_groups));
const versionsMetadata = computed(() => data.value!.versionsMetadata);
const initialBuilds = computed(() => data.value!.initialBuilds);
const initialVersion = computed(() => data.value!.initialVersion);
const initialShowExperimental = computed(
  () => !!project.value.experimentalVersion && initialVersion.value === project.value.experimentalVersion,
);

useHead({
  title: computed(() => project.value.name),
  meta: [{ name: 'description', content: computed(() => `Download the latest ${project.value.name} builds.`) }],
});

const githubUrl = computed(() => `${GITHUB_URL}/${project.value.name}`);
const docsUrl = computed(() => `/docs/${projectId}`);
</script>

<template>
  <PageShell>
    <div class="dl-root">
    <div class="dl-atmosphere" aria-hidden="true" />
    <div class="page-wrap">
      <div class="back-row">
        <Button href="/downloads" variant="ghost" size="sm">
          <ArrowLeft :size="14" :stroke-width="1.8" /> Back to Downloads
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
            <Button v-if="latestBuild" :href="latestBuild.downloads.application.url" target="_blank" rel="noopener noreferrer" variant="primary" size="lg">
              <Download :size="18" :stroke-width="1.7" /> Download Latest Build
            </Button>
            <Button :href="docsUrl" variant="secondary" size="lg">
              <BookOpen :size="18" :stroke-width="1.7" /> Documentation
            </Button>
            <Button :href="githubUrl" target="_blank" rel="noopener noreferrer" variant="secondary" size="lg">
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
            :default-version="initialVersion"
            :stable-default-version="project.latestVersion ?? ''"
            :experimental-version="project.experimentalVersion"
            :versions-metadata="versionsMetadata"
            :initial-builds="initialBuilds"
            :initial-show-experimental="initialShowExperimental"
          />
        </div>
      </section>
    </div>
    </div>
  </PageShell>
</template>

<style scoped>
.dl-root {
	position: relative;
	overflow: hidden;
}

.dl-atmosphere {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	height: 960px;
	pointer-events: none;
	overflow: hidden;
	z-index: 0;
}

.dl-atmosphere::before {
	content: '';
	position: absolute;
	top: -200px;
	left: 50%;
	transform: translateX(-50%);
	width: 1200px;
	height: 800px;
	background: radial-gradient(
		ellipse 50% 45% at 50% 50%,
		color-mix(in oklab, var(--brand-glow) 70%, var(--brand-glow-2)),
		transparent 70%
	);
	filter: blur(50px);
	opacity: 0.55;
}

.dl-atmosphere::after {
	content: '';
	position: absolute;
	inset: 0;
	background-image:
		linear-gradient(to right,  rgba(255, 255, 255, 0.03) 1px, transparent 1px),
		linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
	background-size: 56px 56px;
	mask-image: radial-gradient(ellipse 80% 60% at 50% 30%, black 0%, transparent 75%);
	-webkit-mask-image: radial-gradient(ellipse 80% 60% at 50% 30%, black 0%, transparent 75%);
}

.page-wrap { position: relative; z-index: 1; max-width: 1180px; margin: 0 auto; padding: 60px 24px 80px; }
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
