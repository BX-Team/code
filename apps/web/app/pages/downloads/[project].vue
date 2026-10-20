<script setup lang="ts">
import { Button } from '@bx-team/ui';
import { ArrowLeft, BookOpen, Download, Info } from '@lucide/vue';
import { useRoute } from 'vue-router';
import BuildsList from '@/components/downloads/BuildsList.vue';
import ReleaseList from '@/components/downloads/ReleaseList.vue';
import {
  BUILDS_PER_PAGE,
  type Build,
  commitUrl,
  fetchLatestBuild,
  fetchProject,
  fetchReleases,
  fetchVersion,
  fetchVersions,
  primaryDownload,
  type Release,
  repoUrl,
  type VersionSummary,
} from '@/lib/builds';
import { formatBytes } from '@/lib/format';

const route = useRoute();
const projectKey = String(route.params.project);
const queryVersion = computed(() => {
  const v = route.query.version;
  return typeof v === 'string' && v ? v : null;
});

const { data } = await useAsyncData(`project:${projectKey}`, async () => {
  const project = await fetchProject(projectKey).catch(() => null);
  if (!project) {
    throw createError({ statusCode: 404, statusMessage: 'Project not found', fatal: true });
  }

  // A release project has no versions at all, so nothing below applies to it.
  if (project.kind === 'release') {
    const releases = await fetchReleases(project.key).catch(() => [] as Release[]);
    return {
      project,
      releases,
      versions: [] as string[],
      versionsMetadata: [] as VersionSummary[],
      latestBuild: null as Build | null,
      initialVersion: '',
      initialBuilds: [] as Build[],
      initialNext: null as string | null,
    };
  }

  // Already newest first from the server; re-sorting here would only disagree.
  const versions = project.versions ?? [];
  const requested = queryVersion.value && versions.includes(queryVersion.value) ? queryVersion.value : null;
  const initialVersion = requested ?? project.latest ?? versions[0] ?? '';

  const [versionsMetadata, latestBuild, initial] = await Promise.all([
    fetchVersions(project.key).catch(() => [] as VersionSummary[]),
    project.latest ? fetchLatestBuild(project.key, project.latest).catch(() => null) : Promise.resolve(null),
    initialVersion
      ? fetchVersion(project.key, initialVersion, BUILDS_PER_PAGE).catch(() => null)
      : Promise.resolve(null),
  ]);

  return {
    project,
    releases: [] as Release[],
    versions,
    versionsMetadata,
    latestBuild,
    initialVersion,
    initialBuilds: initial?.builds.items ?? [],
    initialNext: initial?.builds.next ?? null,
  };
});

if (!data.value) throw createError({ statusCode: 500, statusMessage: 'Failed to load project', fatal: true });

const project = computed(() => data.value!.project);
const isRelease = computed(() => project.value.kind === 'release');
const latestBuild = computed(() => data.value!.latestBuild);
const latestRelease = computed(() => data.value!.releases[0] ?? null);

const headline = computed(() => {
  const source = isRelease.value ? latestRelease.value : latestBuild.value;
  if (!source) return null;
  const label = isRelease.value ? (source as Release).tag : `#${(source as Build).build}`;
  return {
    label,
    channel: source.channel,
    at: source.created_at,
    file: primaryDownload(source.downloads),
    commits: source.commits,
  };
});

const releases = computed(() => data.value!.releases);
const versions = computed(() => data.value!.versions);
const versionsMetadata = computed(() => data.value!.versionsMetadata);
const initialVersion = computed(() => data.value!.initialVersion);
const initialBuilds = computed(() => data.value!.initialBuilds);
const initialNext = computed(() => data.value!.initialNext);

const initialShowExperimental = computed(
  () => !!project.value.experimental && initialVersion.value === project.value.experimental,
);

useHead({
  title: computed(() => project.value.name),
  meta: [
    {
      name: 'description',
      content: computed(() =>
        isRelease.value
          ? `Download the latest ${project.value.name} releases.`
          : `Download the latest ${project.value.name} builds.`,
      ),
    },
  ],
});

const sourceUrl = computed(() => repoUrl(project.value));
const docsUrl = computed(() => `/docs/${projectKey}`);

// The content collection is the only thing that knows whether a project is documented.
const { data: hasDocs } = await useAsyncData(`project-docs:${projectKey}`, async () => {
  const page = await queryCollection('docs')
    .where('path', 'LIKE', `/docs/${projectKey}/%`)
    .first()
    .catch(() => null);
  return !!page;
});
</script>

<template>
  <PageShell max-width="1180px" gutter="24px">
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
          <p class="hero-desc">{{ project.description || `Get the latest builds of ${project.name}` }}</p>

          <div v-if="headline" class="stats">
            <div class="stat">
              <div class="stat-label">{{ isRelease ? 'Latest Release' : 'Latest Build' }}</div>
              <div class="stat-val">{{ headline.label }}</div>
            </div>
            <div class="stat">
              <div class="stat-label">Channel</div>
              <div class="stat-val brand-c">{{ headline.channel }}</div>
            </div>
            <div class="stat">
              <div class="stat-label">File Size</div>
              <div class="stat-val">{{ headline.file ? formatBytes(headline.file.size) : '—' }}</div>
            </div>
            <div class="stat">
              <div class="stat-label">Updated</div>
              <div class="stat-val">{{ new Date(headline.at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }}</div>
            </div>
          </div>

          <div class="cta-row">
            <Button v-if="headline?.file" :href="headline.file.url" target="_blank" rel="noopener noreferrer" variant="primary" size="lg">
              <Download :size="18" :stroke-width="1.7" /> {{ isRelease ? 'Download Latest Release' : 'Download Latest Build' }}
            </Button>
            <Button v-if="hasDocs" :href="docsUrl" variant="secondary" size="lg">
              <BookOpen :size="18" :stroke-width="1.7" /> Documentation
            </Button>
            <Button :href="sourceUrl" :target="project.repo ? undefined : '_blank'" :rel="project.repo ? undefined : 'noopener noreferrer'" variant="secondary" size="lg">
              <img src="~/assets/external/github.svg" width="18" height="18" alt="" aria-hidden="true" class="btn-icon" /> Source Code
            </Button>
          </div>
        </div>

        <aside v-if="headline?.commits.length" class="info-side">
          <h3><Info :size="14" :stroke-width="1.7" /> {{ isRelease ? 'Latest Release Info' : 'Latest Build Info' }}</h3>
          <div class="info-label">{{ headline.label }} Changes</div>
          <ul class="info-list">
            <li v-for="c in headline.commits" :key="c.sha">
              <NuxtLink
                :to="commitUrl(project, c.sha)"
                :target="project.repo ? undefined : '_blank'"
                :rel="project.repo ? undefined : 'noopener noreferrer'"
                class="sha"
              >{{ c.sha.substring(0, 7) }}</NuxtLink>
              <p>{{ c.summary }}</p>
            </li>
          </ul>
        </aside>
      </div>

      <section class="builds-section">
        <h2>{{ isRelease ? 'All Releases' : 'All Builds' }}</h2>
        <div class="panel">
          <ReleaseList v-if="isRelease" :project="project" :releases="releases" />
          <BuildsList
            v-else
            :project="project"
            :versions="versions"
            :default-version="initialVersion"
            :versions-metadata="versionsMetadata"
            :initial-builds="initialBuilds"
            :initial-next="initialNext"
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
  background: linear-gradient(180deg, color-mix(in oklab, var(--bg-1) 65%, transparent), color-mix(in oklab, var(--bg-0) 55%, transparent));
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
  background: color-mix(in oklab, var(--bg-2) 55%, transparent);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 12px 14px;
}
.stat-label { font-size: 11px; color: var(--mute); margin-bottom: 4px; }
.stat-val { font-size: 16px; font-weight: 700; color: var(--fg-hi); }
.stat-val.brand-c { color: var(--brand); text-transform: uppercase; }

.cta-row { display: flex; gap: 10px; flex-wrap: wrap; }

.info-side {
  background: color-mix(in oklab, var(--bg-0) 60%, transparent);
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
  background: color-mix(in oklab, var(--bg-1) 50%, transparent);
}
.btn-icon {
  filter: brightness(0) invert(1);
  opacity: 0.75;
}
</style>
