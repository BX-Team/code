<script setup lang="ts">
import { Button, PageHero, Section } from '@bx-team/ui';
import { ArrowRight, ArrowUpRight, Download } from '@lucide/vue';
import {
  type BuildCommit,
  type Channel,
  commitUrl,
  type Download as File,
  fetchLatestBuild,
  fetchLatestRelease,
  fetchProjects,
  getChannelColor,
  type ProjectSummary,
  primaryDownload,
} from '@/lib/builds';
import { formatBytes } from '@/lib/format';
import { findProject } from '~/config/projects';

/** A versioned project's newest publication is a build, a release project's is a
 *  tag; the card is the same either way, so the difference is resolved here. */
interface Entry {
  project: ProjectSummary;
  label: string;
  channel: Channel;
  at: string;
  file?: File;
  commits: BuildCommit[];
}

async function latestOf(project: ProjectSummary): Promise<Entry | null> {
  if (project.kind === 'release') {
    const release = await fetchLatestRelease(project.key).catch(() => null);
    if (!release) return null;
    return {
      project,
      label: release.tag,
      channel: release.channel,
      at: release.created_at,
      file: primaryDownload(release.downloads),
      commits: release.commits,
    };
  }

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

// Only the list itself may fail: a project whose newest publication cannot be
// read still belongs on the page, and an unreachable API is not an empty one.
const { data: entries, error } = await useAsyncData<{ project: ProjectSummary; latest: Entry | null }[]>(
  'downloads:projects',
  async () => {
    const projects = await fetchProjects();
    return Promise.all(projects.map(async project => ({ project, latest: await latestOf(project) })));
  },
  { default: () => [] },
);

useHead({
  title: 'Downloads',
  meta: [{ name: 'description', content: 'Download the latest builds and releases of our software.' }],
});
</script>

<template>
  <PageShell overlay>
    <PageHero
      title="Downloads"
      tagline="The latest versions of our projects, ready to download"
      lede="Grab the newest version below, or open a project to see all of its builds."
    />

    <Section title="Projects" lede="The latest version of each project.">
      <div v-if="entries.length" class="dl-list">
        <article v-for="{ project, latest } in entries" :key="project.key" class="dl-card">
          <div class="dl-card__head">
            <NuxtLink :to="`/downloads/${project.key}`" class="dl-card__title">
              <h3>{{ project.name }}</h3>
            </NuxtLink>
            <span v-if="latest" class="bx-channel" :class="getChannelColor(latest.channel)">{{ latest.channel }}</span>
          </div>
          <p class="dl-card__desc">{{ project.description || 'No description available.' }}</p>

          <dl v-if="latest" class="dl-card__facts">
            <div>
              <dt>{{ project.kind === 'release' ? 'Latest release' : 'Latest build' }}</dt>
              <dd>{{ latest.label }}</dd>
            </div>
            <div>
              <dt>Size</dt>
              <dd>{{ latest.file ? formatBytes(latest.file.size) : '—' }}</dd>
            </div>
            <div>
              <dt>Updated</dt>
              <dd>{{ new Date(latest.at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }}</dd>
            </div>
          </dl>

          <div v-if="latest?.commits.length" class="dl-card__changes">
            <p class="bx-micro">Recent changes</p>
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
              Download latest
            </Button>
            <Button :href="`/downloads/${project.key}`" variant="secondary">
              <ArrowRight :size="16" :stroke-width="1.7" />
              {{ project.kind === 'release' ? 'All releases' : 'All builds' }}
            </Button>
            <NuxtLink v-if="findProject(project.key)" :to="`/${project.key}`" class="bx-link dl-card__about">
              About {{ project.name }}
              <ArrowUpRight :size="14" :stroke-width="1.7" />
            </NuxtLink>
          </div>
        </article>
      </div>

      <p v-else-if="error" class="bx-callout bx-callout--err">
        <span class="bx-callout__mark">Unavailable</span>
        <span>The downloads API could not be reached. Please try again in a moment.</span>
      </p>

      <p v-else class="bx-callout bx-callout--note">
        <span class="bx-callout__mark">Empty</span>
        <span>There are currently no projects available for download.</span>
      </p>
    </Section>
  </PageShell>
</template>

<style scoped>
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
  border-radius: var(--r-1);
}

.dl-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s-3);
}

.dl-card__title h3 {
  margin: 0;
  font: 600 26px/1.2 var(--font-heading);
  letter-spacing: -0.015em;
  color: var(--fg);
  transition: color 0.15s ease;
}

.dl-card__title:hover h3 {
  color: var(--accent);
}

.dl-card__desc {
  max-width: 44rem;
  margin: 0;
  font: 400 13.5px/1.6 var(--font-mono);
  color: var(--dim);
}

.dl-card__facts {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin: 0;
  border-top: 1px solid var(--line);
  border-left: 1px solid var(--line);
}

.dl-card__facts div {
  padding: var(--s-4) var(--s-5);
  border-right: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
}

.dl-card__facts dt {
  font: 500 11px/1.4 var(--font-mono);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--mute);
}

.dl-card__facts dd {
  margin: var(--s-1) 0 0;
  font: 600 20px/1.2 var(--font-heading);
  letter-spacing: -0.015em;
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
  font: 400 13.5px/1.5 var(--font-mono);
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
