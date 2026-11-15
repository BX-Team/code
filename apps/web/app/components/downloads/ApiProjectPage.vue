<script setup lang="ts">
import { Button, Section } from '@bx-team/ui';
import { ArrowUpRight, BookOpen, Download } from '@lucide/vue';
import { useRoute } from 'vue-router';
import BuildsList from '@/components/downloads/BuildsList.vue';
import DownloadsHeader from '@/components/downloads/DownloadsHeader.vue';
import {
  BUILDS_PER_PAGE,
  commitUrl,
  fetchLatestBuild,
  fetchProject,
  fetchVersion,
  fetchVersions,
  getChannelColor,
  primaryDownload,
  repoUrl,
  type VersionSummary,
} from '@/lib/builds';
import { formatBytes } from '@/lib/format';
import githubSvgRaw from '~/assets/external/github.svg?raw';
import { findProject } from '~/config/projects';

/** A project the downloads API publishes: builds per Minecraft version. */
const props = defineProps<{ projectKey: string }>();

const route = useRoute();
const projectKey = props.projectKey;
const queryVersion = computed(() => {
  const v = route.query.version;
  return typeof v === 'string' && v ? v : null;
});

const { data } = await useAsyncData(`project:${projectKey}`, async () => {
  const project = await fetchProject(projectKey).catch(() => null);
  if (!project) {
    throw createError({ statusCode: 404, statusMessage: 'Project not found', fatal: true });
  }

  // Already newest first from the server; re-sorting here would only disagree.
  const versions = project.versions;
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
const latestBuild = computed(() => data.value!.latestBuild);

const headline = computed(() => {
  const source = latestBuild.value;
  if (!source) return null;
  return {
    label: `#${source.build}`,
    version: source.version,
    channel: source.channel,
    at: source.created_at,
    file: primaryDownload(source.downloads),
    commits: source.commits,
  };
});

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
      content: computed(() => `Download the latest ${project.value.name} builds.`),
    },
  ],
});

const sourceUrl = computed(() => repoUrl(project.value));
const about = computed(() => findProject(projectKey));

const updated = computed(() =>
  headline.value
    ? new Date(headline.value.at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '',
);
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
  <PageShell>
    <main class="dlp">
      <DownloadsHeader
        crumb
        :title="project.name"
        :description="project.description || `Get the latest builds of ${project.name}.`"
      >
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
          <span class="dlp-gh" v-html="githubSvgRaw" />
          Source
        </Button>
        <NuxtLink v-if="about" :to="`/${about.slug}`" class="bx-link dlp-about">
          About {{ about.name }}
          <ArrowUpRight :size="14" :stroke-width="1.7" />
        </NuxtLink>
      </DownloadsHeader>

      <div v-if="headline" class="dlp-wrap">
      <section class="dlp-latest" aria-labelledby="dlp-latest-title">
        <div class="dlp-latest__main">
          <p id="dlp-latest-title" class="dlp-eyebrow">Latest build</p>
          <div class="dlp-latest__id">
            <span class="dlp-latest__label bx-text-grad">{{ headline.label }}</span>
            <span v-if="headline.version" class="dlp-latest__version">{{ headline.version }}</span>
            <span class="bx-channel" :class="getChannelColor(headline.channel)">{{ headline.channel }}</span>
          </div>
          <dl class="dlp-facts">
            <div><dt>Size</dt><dd>{{ headline.file ? formatBytes(headline.file.size) : '—' }}</dd></div>
            <div><dt>Published</dt><dd>{{ updated }}</dd></div>
          </dl>
          <div v-if="headline.file" class="dlp-get">
            <Button :href="headline.file.url" target="_blank" rel="noopener noreferrer" variant="primary" size="lg">
              <Download :size="16" :stroke-width="1.7" />
              Download
            </Button>
            <code class="dlp-file">{{ headline.file.name }}</code>
          </div>
        </div>

        <div v-if="headline.commits.length" class="dlp-latest__changes">
          <p class="dlp-eyebrow">What's new in {{ headline.label }}</p>
          <ul class="dlp-changes">
            <li v-for="c in headline.commits" :key="c.sha">
              <NuxtLink
                :to="commitUrl(project, c.sha)"
                :target="project.repo ? undefined : '_blank'"
                :rel="project.repo ? undefined : 'noopener noreferrer'"
                class="dlp-sha"
              >{{ c.sha.substring(0, 7) }}</NuxtLink>
              <span>{{ c.summary }}</span>
            </li>
          </ul>
        </div>
      </section>
      </div>

      <Section title="All builds" lede="Every build for the selected Minecraft version, newest first.">
        <BuildsList
          :project="project"
          :versions="versions"
          :default-version="initialVersion"
          :versions-metadata="versionsMetadata"
          :initial-builds="initialBuilds"
          :initial-next="initialNext"
          :initial-show-experimental="initialShowExperimental"
        />
      </Section>
    </main>
  </PageShell>
</template>

<style scoped>
.dlp-wrap {
  max-width: var(--container);
  box-sizing: border-box;
  margin: 0 auto;
  padding: 0 var(--s-4);
}

.dlp-gh {
  display: inline-flex;
  line-height: 0;
}

.dlp-gh :deep(svg) {
  width: 16px;
  height: 16px;
}

.dlp-about {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: var(--s-2);
  font-size: 13.5px;
}

.dlp-latest {
  display: flex;
  flex-wrap: wrap;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: var(--r-4);
  background:
    radial-gradient(60% 120% at 0% 0%, color-mix(in srgb, var(--accent) 10%, transparent), transparent 60%),
    var(--surface-card);
}

.dlp-latest__main {
  flex: 1 1 340px;
  display: flex;
  flex-direction: column;
  gap: var(--s-5);
  padding: var(--s-6);
}

.dlp-eyebrow {
  margin: 0;
  font: 500 11px/1.4 var(--font-mono);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--mute);
}

.dlp-latest__id {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--s-2) var(--s-4);
}

.dlp-latest__label {
  font: 900 56px/0.9 var(--font-sans);
  letter-spacing: -0.05em;
}

.dlp-latest__version {
  font: 700 22px/1 var(--font-sans);
  letter-spacing: -0.03em;
  color: var(--fg);
}

.dlp-facts {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-2) var(--s-8);
  margin: 0;
}

.dlp-facts dt {
  font: 500 11px/1.4 var(--font-mono);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--mute);
}

.dlp-facts dd {
  margin: 2px 0 0;
  font: 500 15px/1.4 var(--font-sans);
  color: var(--fg);
}

.dlp-get {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--s-3);
  margin-top: auto;
}

.dlp-file {
  font: 400 12.5px/1.4 var(--font-mono);
  color: var(--mute);
  overflow-wrap: anywhere;
}

.dlp-latest__changes {
  flex: 1.4 1 380px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--s-3);
  padding: var(--s-6);
  border-left: 1px solid var(--line);
  background: var(--surface-1);
}

.dlp-changes {
  max-height: 280px;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  list-style: none;
}

.dlp-changes li {
  display: flex;
  align-items: baseline;
  gap: var(--s-3);
  padding: var(--s-2) 0;
  border-bottom: 1px solid var(--line);
  font: 400 13.5px/1.5 var(--font-sans);
  color: var(--dim);
}

.dlp-changes li:last-child {
  border-bottom: 0;
}

.dlp-sha {
  flex-shrink: 0;
  font: 400 12.5px/1.5 var(--font-mono);
  color: var(--accent);
}

.dlp-sha:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}

@media (max-width: 760px) {
  .dlp-latest__changes {
    border-left: 0;
    border-top: 1px solid var(--line);
  }

  .dlp-latest__label {
    font-size: 44px;
  }
}
</style>
