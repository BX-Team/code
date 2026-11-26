<script setup lang="ts">
import { Button } from '@bx-team/ui';
import { ArrowRight, ArrowUpRight, Download } from '@lucide/vue';
import DownloadsHeader from '@/components/downloads/DownloadsHeader.vue';
import {
  type BuildCommit,
  type Channel,
  commitUrl,
  type Download as File,
  fetchLatestBuild,
  fetchProjects,
  getChannelColor,
  type ProjectSummary,
  primaryDownload,
} from '@/lib/builds';
import { findProject, PROJECTS } from '~/config/projects';
import { fetchGithubReleases } from '~/lib/releases';

interface Entry {
  project: ProjectSummary;
  label: string;
  channel: Channel;
  at: string;
  file?: File;
  commits: BuildCommit[];
}

const { t } = useI18n();
const sitePath = useSitePath();
const format = useFormat();

async function latestOf(project: ProjectSummary): Promise<Entry | null> {
  if (!project.latest) return null;
  const build = await fetchLatestBuild(project.key, project.latest).catch(() => null);
  if (!build) return null;
  return {
    project,
    label: `#${build.build}`,
    channel: build.channel,
    at: build.created_at,
    file: primaryDownload(build.downloads),
    commits: build.commits,
  };
}

// Only the list may fail: a project whose newest build can't be read still belongs on the page.
const { data: entries, error } = await useAsyncData<{ project: ProjectSummary; latest: Entry | null }[]>(
  'downloads:projects',
  async () => {
    const projects = await fetchProjects();
    return Promise.all(projects.map(async project => ({ project, latest: await latestOf(project) })));
  },
  { default: () => [] },
);

/** Projects published only on GitHub: their newest release is read from there, beside the API's. */
const githubProjects = PROJECTS.filter(p => p.githubReleases);
const { data: githubEntries } = useLazyAsyncData(
  'downloads:github',
  () =>
    Promise.all(
      githubProjects.map(async site => {
        const releases = await fetchGithubReleases(site.repo, 5).catch(() => []);
        const latest = releases.find(r => !r.prerelease) ?? releases[0] ?? null;
        return { site, latest };
      }),
    ),
  { server: false, default: () => [] },
);

useHead({
  title: () => t('downloads.title'),
  meta: [{ name: 'description', content: () => t('downloads.description') }],
});
</script>

<template>
  <PageShell>
    <DownloadsHeader :title="t('downloads.title')" :description="t('downloads.lede')" />

    <div class="dl-body">
      <div v-if="entries.length || githubEntries.length" class="dl-list">
        <article v-for="{ project, latest } in entries" :key="project.key" class="dl-card">
          <div class="dl-card__head">
            <NuxtLink :to="sitePath(`/downloads/${project.key}`)" class="dl-card__title">
              <h3>{{ project.name }}</h3>
            </NuxtLink>
            <span v-if="latest" class="bx-channel" :class="getChannelColor(latest.channel)">{{ latest.channel }}</span>
          </div>
          <p class="dl-card__desc">{{ project.description || t('downloads.noDescription') }}</p>

          <dl v-if="latest" class="dl-card__facts">
            <div>
              <dt>{{ t('downloads.latestBuild') }}</dt>
              <dd>{{ latest.label }}</dd>
            </div>
            <div>
              <dt>{{ t('downloads.size') }}</dt>
              <dd>{{ latest.file ? format.bytes(latest.file.size) : '—' }}</dd>
            </div>
            <div>
              <dt>{{ t('downloads.updated') }}</dt>
              <dd>{{ format.date(latest.at) }}</dd>
            </div>
          </dl>

          <div v-if="latest?.commits.length" class="dl-card__changes">
            <p class="bx-micro">{{ t('downloads.recent') }}</p>
            <ul>
              <li v-for="c in latest.commits.slice(0, 3)" :key="c.sha">
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

          <div class="dl-card__foot">
            <Button v-if="latest?.file" :href="latest.file.url" target="_blank" rel="noopener noreferrer" variant="primary">
              <Download :size="16" :stroke-width="1.7" />
              {{ t('downloads.downloadLatest') }}
            </Button>
            <Button :href="sitePath(`/downloads/${project.key}`)" variant="secondary">
              <ArrowRight :size="16" :stroke-width="1.7" />
              {{ t('downloads.allBuilds') }}
            </Button>
            <NuxtLink v-if="findProject(project.key)" :to="sitePath(`/${project.key}`)" class="bx-link dl-card__about">
              {{ t('downloads.about', { name: project.name }) }}
              <ArrowUpRight :size="14" :stroke-width="1.7" />
            </NuxtLink>
          </div>
        </article>

        <article v-for="{ site, latest } in githubEntries" :key="site.slug" class="dl-card">
          <div class="dl-card__head">
            <NuxtLink :to="sitePath(`/downloads/${site.slug}`)" class="dl-card__title">
              <h3>{{ site.name }}</h3>
            </NuxtLink>
            <span class="dl-card__source">{{ t('downloads.githubReleases') }}</span>
          </div>
          <p class="dl-card__desc">{{ t(`projects.${site.slug}.summary`) }}</p>

          <dl v-if="latest" class="dl-card__facts">
            <div>
              <dt>{{ t('downloads.latestRelease') }}</dt>
              <dd>{{ latest.tag_name }}</dd>
            </div>
            <div>
              <dt>{{ t('downloads.files') }}</dt>
              <dd>{{ latest.assets.length }}</dd>
            </div>
            <div>
              <dt>{{ t('downloads.updated') }}</dt>
              <dd>{{ latest.published_at ? format.date(latest.published_at) : '—' }}</dd>
            </div>
          </dl>

          <div class="dl-card__foot">
            <Button :href="sitePath(`/downloads/${site.slug}`)" variant="primary">
              <Download :size="16" :stroke-width="1.7" />
              {{ t('downloads.choose') }}
            </Button>
            <NuxtLink :to="sitePath(`/${site.slug}`)" class="bx-link dl-card__about">
              {{ t('downloads.about', { name: site.name }) }}
              <ArrowUpRight :size="14" :stroke-width="1.7" />
            </NuxtLink>
          </div>
        </article>
      </div>

      <p v-if="error" class="bx-callout bx-callout--err">
        <span class="bx-callout__mark">{{ t('downloads.unavailable') }}</span>
        <span>{{ t('downloads.apiDown') }}</span>
      </p>

      <p v-if="!error && !entries.length && !githubEntries.length" class="bx-callout bx-callout--note">
        <span class="bx-callout__mark">{{ t('downloads.empty') }}</span>
        <span>{{ t('downloads.noProjects') }}</span>
      </p>
    </div>
  </PageShell>
</template>

<style scoped>
.dl-body {
  display: flex;
  flex-direction: column;
  gap: var(--s-4);
  max-width: var(--container);
  box-sizing: border-box;
  margin: 0 auto;
  padding: 0 var(--s-4);
}

.dl-card__source {
  font: 500 11px/1.4 var(--font-mono);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--mute);
}

.dl-list {
  display: flex;
  flex-direction: column;
  gap: var(--s-6);
}

.dl-card {
  display: flex;
  flex-direction: column;
  gap: var(--s-4);
  padding: var(--s-6);
  background: var(--surface-card);
  border: 1px solid var(--line);
  border-radius: var(--r-4);
}

.dl-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s-3);
}

.dl-card__title h3 {
  margin: 0;
  font: 800 26px/1.15 var(--font-heading);
  letter-spacing: -0.04em;
  color: var(--fg);
  transition: color 0.15s ease;
}

.dl-card__title:hover h3 {
  color: var(--accent);
}

.dl-card__desc {
  max-width: 44rem;
  margin: 0;
  font: 400 13.5px/1.6 var(--font-sans);
  color: var(--dim);
}

.dl-card__facts {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1px;
  margin: 0;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: var(--r-3);
  background: var(--line);
}

.dl-card__facts div {
  padding: var(--s-4) var(--s-5);
  background: var(--surface-1);
}

.dl-card__facts dt {
  font: 500 11px/1.4 var(--font-mono);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--mute);
}

.dl-card__facts dd {
  margin: var(--s-1) 0 0;
  font: 800 20px/1.2 var(--font-heading);
  letter-spacing: -0.03em;
  color: var(--fg);
}

.dl-card__changes ul {
  display: flex;
  flex-direction: column;
  margin: var(--s-3) 0 0;
  padding: 0;
  list-style: none;
}

.dl-card__changes li {
  display: flex;
  align-items: baseline;
  gap: var(--s-3);
  padding: var(--s-2) 0;
  border-bottom: 1px solid var(--line);
  font: 400 13.5px/1.5 var(--font-sans);
  color: var(--dim);
}

.dl-card__changes li:last-child {
  border-bottom: 0;
}

.dl-sha {
  flex-shrink: 0;
  font: 400 12.5px/1.5 var(--font-mono);
  color: var(--accent);
}

.dl-sha:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}

.dl-card__foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--s-3);
  padding-top: var(--s-2);
}

.dl-card__about {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
  font-size: 13.5px;
}

@media (max-width: 640px) {
  .dl-card__facts {
    grid-template-columns: 1fr;
  }

  .dl-card__about {
    margin-left: 0;
  }
}
</style>
