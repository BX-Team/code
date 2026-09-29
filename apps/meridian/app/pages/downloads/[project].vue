<script setup lang="ts">
import { Button, PageHero, type PageHeroStat, Section } from '@bx-team/ui';
import { ArrowUpRight, BookOpen, Download } from '@lucide/vue';
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
import githubSvgRaw from '~/assets/external/github.svg?raw';
import { findProject } from '~/config/projects';

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
const about = computed(() => findProject(projectKey));

const stats = computed<PageHeroStat[]>(() => {
  const h = headline.value;
  if (!h) return [];
  const channel = h.channel?.toLowerCase();
  return [
    { label: isRelease.value ? 'Latest release' : 'Latest build', value: h.label },
    {
      label: 'Channel',
      value: h.channel,
      channel: channel === 'stable' || channel === 'beta' || channel === 'alpha' ? channel : undefined,
    },
    { label: 'File size', value: h.file ? formatBytes(h.file.size) : '—' },
    {
      label: 'Updated',
      value: new Date(h.at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    },
  ];
});
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
  <PageShell overlay>
    <PageHero
      :title="project.name"
      :lede="project.description || `Get the latest builds of ${project.name}.`"
      :stats="stats"
    >
      <template #crumbs>
        <NuxtLink to="/downloads">Downloads</NuxtLink>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{{ project.name }}</span>
      </template>
      <template #cta>
        <Button v-if="headline?.file" :href="headline.file.url" target="_blank" rel="noopener noreferrer" variant="primary">
          <Download :size="16" :stroke-width="1.7" />
          {{ isRelease ? 'Download latest release' : 'Download latest build' }}
        </Button>
        <Button v-if="hasDocs" :href="docsUrl" variant="secondary">
          <BookOpen :size="16" :stroke-width="1.7" />
          Documentation
        </Button>
        <Button
          :href="sourceUrl"
          :target="project.repo ? undefined : '_blank'"
          :rel="project.repo ? undefined : 'noopener noreferrer'"
          variant="ghost"
        >
          <span class="dl-gh" v-html="githubSvgRaw" />
          Source code
        </Button>
      </template>
      <template v-if="about" #meta>
        <NuxtLink :to="`/${about.slug}`" class="bx-link dl-about">
          About {{ about.name }}
          <ArrowUpRight :size="14" :stroke-width="1.7" />
        </NuxtLink>
      </template>
      <template v-if="headline?.commits.length" #aside>
        <div class="dl-aside">
          <p class="bx-micro">What's in {{ headline.label }}</p>
          <ul class="dl-changes">
            <li v-for="c in headline.commits" :key="c.sha">
              <NuxtLink
                :to="commitUrl(project, c.sha)"
                :target="project.repo ? undefined : '_blank'"
                :rel="project.repo ? undefined : 'noopener noreferrer'"
                class="dl-sha"
              >{{ c.sha.substring(0, 7) }}</NuxtLink>
              <span>{{ c.summary }}</span>
            </li>
          </ul>
        </div>
      </template>
    </PageHero>


    <Section
      :title="isRelease ? 'All releases' : 'All builds'"
      :lede="isRelease ? 'Every tagged release, newest first.' : 'Every build for the selected Minecraft version, newest first.'"
    >
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
    </Section>
  </PageShell>
</template>

<style scoped>
.dl-gh {
  display: inline-flex;
  line-height: 0;
}

.dl-gh :deep(svg) {
  width: 16px;
  height: 16px;
}

.dl-about {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.dl-aside {
  padding: var(--s-5) var(--s-5) var(--s-2);
}

.dl-changes {
  max-height: 320px;
  margin: var(--s-3) 0 0;
  padding: 0;
  overflow-y: auto;
  list-style: none;
}

.dl-changes li {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--s-3) 0;
  border-bottom: 1px solid var(--line);
  font: 400 13px/1.5 var(--font-mono);
  color: var(--dim);
}

.dl-changes li:last-child {
  border-bottom: 0;
}

.dl-sha {
  flex-shrink: 0;
  font: 400 12.5px/1.55 var(--font-mono);
  color: var(--accent);
}

.dl-sha:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}
</style>
