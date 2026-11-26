<script setup lang="ts">
import { Button, Section } from '@bx-team/ui';
import { ArrowUpRight, BookOpen, Download, Loader2 } from '@lucide/vue';
import DownloadsHeader from '@/components/downloads/DownloadsHeader.vue';
import githubSvgRaw from '~/assets/external/github.svg?raw';
import type { Project } from '~/config/projects';
import { renderNotes } from '~/lib/markdown';
import {
  classify,
  detectPlatform,
  fetchGithubReleases,
  PLATFORMS,
  type Platform,
  type ReleaseFile,
  type RestRelease,
} from '~/lib/releases';

const props = defineProps<{ project: Project }>();
const { t } = useI18n();
const sitePath = useSitePath();
const format = useFormat();
const kind = (f: ReleaseFile) => t(f.platform === 'cli' ? `releases.platforms.${f.kind}` : `releases.kinds.${f.kind}`);

const repoUrl = `https://github.com/${props.project.repo}`;

const {
  data: releases,
  status,
  error,
} = useLazyAsyncData(`gh-releases:${props.project.slug}`, () => fetchGithubReleases(props.project.repo), {
  server: false,
  default: () => [] as RestRelease[],
});

const latest = computed(() => releases.value.find(r => !r.prerelease) ?? releases.value[0] ?? null);
const older = computed(() => releases.value.filter(r => r !== latest.value));
const files = computed(() => (latest.value ? classify(latest.value) : []));
const notes = computed(() => (latest.value?.body ? renderNotes(latest.value.body) : ''));

function groupsOf(list: ReleaseFile[]) {
  return PLATFORMS.map(id => ({ id, files: list.filter(f => f.platform === id) })).filter(g => g.files.length);
}

const groups = computed(() => groupsOf(files.value));
const detected = detectPlatform();
const tab = ref<Platform | null>(null);
const current = computed(() => {
  const ids = groups.value.map(g => g.id);
  const pick =
    tab.value && ids.includes(tab.value) ? tab.value : detected && ids.includes(detected) ? detected : ids[0];
  return groups.value.find(g => g.id === pick) ?? null;
});

const recommended = computed(() => {
  if (!detected) return null;
  const file = files.value.find(f => f.platform === detected && f.arch !== 'arm64');
  return file ? { file, os: detected } : null;
});

const notesOf = (release: RestRelease) => (release.body ? renderNotes(release.body) : '');

useHead({
  title: () => t('releases.title', { name: props.project.name }),
  meta: [{ name: 'description', content: () => t('releases.description', { name: props.project.name }) }],
});
</script>

<template>
  <PageShell>
    <main>
      <DownloadsHeader crumb :title="project.name" :description="t(`projects.${project.slug}.summary`)">
        <Button v-if="project.docs" :href="project.docs" variant="secondary">
          <BookOpen :size="16" :stroke-width="1.7" />
          {{ t('project.docs') }}
        </Button>
        <Button :href="`${repoUrl}/releases`" target="_blank" rel="noopener noreferrer" variant="ghost">
          <span class="gr-gh" v-html="githubSvgRaw" />
          {{ t('releases.onGithub') }}
        </Button>
        <NuxtLink :to="sitePath(`/${project.slug}`)" class="bx-link gr-about">
          {{ t('downloads.about', { name: project.name }) }}
          <ArrowUpRight :size="14" :stroke-width="1.7" />
        </NuxtLink>
      </DownloadsHeader>

      <div class="gr-wrap">
        <div v-if="status === 'pending' || status === 'idle'" class="gr-state">
          <Loader2 class="gr-spin" :size="24" :stroke-width="1.7" />
          <span>{{ t('releases.loading') }}</span>
        </div>

        <p v-else-if="error" class="bx-callout bx-callout--err">
          <span class="bx-callout__mark">{{ t('downloads.unavailable') }}</span>
          <i18n-t keypath="releases.error" tag="span" scope="global">
            <template #github>
              <a class="bx-link" :href="`${repoUrl}/releases`" target="_blank" rel="noopener noreferrer">GitHub</a>
            </template>
          </i18n-t>
        </p>

        <template v-else-if="latest">
          <section class="gr-latest" aria-labelledby="gr-latest-title">
            <div class="gr-latest__main">
              <p id="gr-latest-title" class="gr-eyebrow">{{ t('downloads.latestRelease') }}</p>
              <div class="gr-latest__id">
                <span class="gr-latest__tag bx-text-grad">{{ latest.tag_name }}</span>
                <span v-if="latest.prerelease" class="bx-channel bx-channel--beta">{{ t('releases.prerelease') }}</span>
              </div>
              <dl class="gr-facts">
                <div><dt>{{ t('releases.published') }}</dt><dd>{{ latest.published_at ? format.dateTime(latest.published_at) : '—' }}</dd></div>
                <div><dt>{{ t('downloads.files') }}</dt><dd>{{ latest.assets.length }}</dd></div>
              </dl>
              <div class="gr-get">
                <Button v-if="recommended" :href="recommended.file.url" variant="primary" size="lg">
                  <Download :size="16" :stroke-width="1.7" />
                  {{ t('releases.downloadFor', { os: t(`releases.platforms.${recommended.os}`) }) }}
                </Button>
                <span v-if="recommended" class="gr-file">
                  {{ kind(recommended.file) }} {{ recommended.file.ext }} · {{ format.bytes(recommended.file.size) }}
                </span>
                <a v-else class="bx-link" href="#files">{{ t('releases.pick') }}</a>
              </div>
              <a class="bx-link gr-ext" :href="latest.html_url" target="_blank" rel="noopener noreferrer">
                {{ t('releases.thisOnGithub') }}
                <ArrowUpRight :size="14" :stroke-width="1.7" />
              </a>
            </div>

            <div v-if="notes" class="gr-latest__notes">
              <p class="gr-eyebrow">{{ t('releases.whatsNew', { tag: latest.tag_name }) }}</p>
              <!-- eslint-disable-next-line vue/no-v-html -- sanitised in renderNotes; see app/lib/markdown.ts -->
              <div class="gr-notes" v-html="notes" />
            </div>
          </section>

          <section v-if="groups.length" id="files" class="gr-files" :aria-label="t('downloads.files')">
            <div class="gr-tabs" role="tablist" :aria-label="t('releases.platform')">
              <button
                v-for="g in groups"
                :key="g.id"
                type="button"
                role="tab"
                class="gr-tab"
                :class="{ 'gr-tab--on': current?.id === g.id }"
                :aria-selected="current?.id === g.id"
                @click="tab = g.id"
              >
                {{ t(`releases.platforms.${g.id}`) }}
                <span class="gr-tab__count">{{ g.files.length }}</span>
              </button>
            </div>
            <ul v-if="current" class="gr-list" role="tabpanel">
              <li v-for="f in current.files" :key="f.name">
                <a class="gr-row" :href="f.url">
                  <span class="gr-row__kind">{{ kind(f) }}<span class="gr-row__ext">{{ f.ext }}</span></span>
                  <span class="gr-row__arch">{{ f.arch ?? '' }}</span>
                  <span class="gr-row__name">{{ f.name }}</span>
                  <span class="gr-row__size">{{ format.bytes(f.size) }}</span>
                  <Download class="gr-row__icon" :size="16" :stroke-width="1.7" aria-hidden="true" />
                </a>
              </li>
            </ul>
          </section>
        </template>

        <p v-else class="bx-callout bx-callout--note">
          <span class="bx-callout__mark">{{ t('downloads.empty') }}</span>
          <span>{{ t('releases.none', { name: project.name }) }}</span>
        </p>
      </div>

      <Section v-if="older.length" :title="t('releases.earlier')" :lede="t('releases.earlierLede')">
        <div class="gr-older">
          <details v-for="r in older" :key="r.tag_name" class="gr-release">
            <summary>
              <span class="gr-release__tag">{{ r.tag_name }}</span>
              <span v-if="r.prerelease" class="bx-channel bx-channel--beta">{{ t('releases.prerelease') }}</span>
              <span class="gr-release__meta">
                {{ r.published_at ? format.dateTime(r.published_at) : '' }} · {{ t('releases.fileCount', r.assets.length) }}
              </span>
            </summary>
            <div class="gr-release__body">
              <!-- eslint-disable-next-line vue/no-v-html -- sanitised in renderNotes; see app/lib/markdown.ts -->
              <div v-if="r.body" class="gr-notes" v-html="notesOf(r)" />
              <div v-for="g in groupsOf(classify(r))" :key="g.id" class="gr-release__group">
                <p class="gr-eyebrow">{{ t(`releases.platforms.${g.id}`) }}</p>
                <ul class="gr-list gr-list--flat">
                  <li v-for="f in g.files" :key="f.name">
                    <a class="gr-row" :href="f.url">
                      <span class="gr-row__kind">{{ kind(f) }}<span class="gr-row__ext">{{ f.ext }}</span></span>
                      <span class="gr-row__arch">{{ f.arch ?? '' }}</span>
                      <span class="gr-row__name">{{ f.name }}</span>
                      <span class="gr-row__size">{{ format.bytes(f.size) }}</span>
                      <Download class="gr-row__icon" :size="16" :stroke-width="1.7" aria-hidden="true" />
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </details>
        </div>
      </Section>
    </main>
  </PageShell>
</template>

<style scoped>
.gr-wrap {
  max-width: var(--container);
  box-sizing: border-box;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--s-4);
  padding: 0 var(--s-4);
}

.gr-gh {
  display: inline-flex;
  line-height: 0;
}

.gr-gh :deep(svg) {
  width: 16px;
  height: 16px;
}

.gr-about,
.gr-ext {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13.5px;
}

.gr-about {
  margin-left: var(--s-2);
}

.gr-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--s-3);
  padding: var(--s-16) 0;
  font: 400 14px/1.4 var(--font-sans);
  color: var(--mute);
}

.gr-spin {
  animation: gr-spin 1s linear infinite;
}

@keyframes gr-spin {
  to {
    transform: rotate(360deg);
  }
}

.gr-latest {
  display: flex;
  flex-wrap: wrap;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: var(--r-4);
  background:
    radial-gradient(60% 120% at 0% 0%, color-mix(in srgb, var(--accent) 10%, transparent), transparent 60%),
    var(--surface-card);
}

.gr-latest__main {
  flex: 1 1 340px;
  display: flex;
  flex-direction: column;
  gap: var(--s-5);
  padding: var(--s-6);
}

.gr-eyebrow {
  margin: 0;
  font: 500 11px/1.4 var(--font-mono);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--mute);
}

.gr-latest__id {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--s-2) var(--s-4);
}

.gr-latest__tag {
  font: 900 52px/0.95 var(--font-sans);
  letter-spacing: -0.05em;
}

.gr-facts {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-2) var(--s-8);
  margin: 0;
}

.gr-facts dt {
  font: 500 11px/1.4 var(--font-mono);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--mute);
}

.gr-facts dd {
  margin: 2px 0 0;
  font: 500 15px/1.4 var(--font-sans);
  color: var(--fg);
}

.gr-get {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--s-3);
  margin-top: auto;
}

.gr-file {
  font: 400 12.5px/1.4 var(--font-mono);
  color: var(--mute);
}

.gr-latest__notes {
  flex: 1.4 1 380px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--s-3);
  padding: var(--s-6);
  border-left: 1px solid var(--line);
  background: var(--surface-1);
}

.gr-latest__notes .gr-notes {
  max-height: 300px;
  overflow-y: auto;
}

.gr-notes {
  font: 400 13.5px/1.65 var(--font-sans);
  color: var(--dim);
  overflow-wrap: break-word;
}

.gr-notes :deep(> :first-child) {
  margin-top: 0;
}

.gr-notes :deep(> :last-child) {
  margin-bottom: 0;
}

.gr-notes :deep(h1),
.gr-notes :deep(h2),
.gr-notes :deep(h3),
.gr-notes :deep(h4) {
  margin: 14px 0 6px;
  font: 700 14px/1.4 var(--font-sans);
  color: var(--fg);
}

.gr-notes :deep(p) {
  margin: 0 0 10px;
}

.gr-notes :deep(ul),
.gr-notes :deep(ol) {
  margin: 0 0 10px;
  padding-left: 20px;
}

.gr-notes :deep(a) {
  color: var(--accent);
}

.gr-notes :deep(code) {
  font: 400 12.5px var(--font-mono);
  color: var(--fg);
}

.gr-files {
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: var(--r-4);
  background: var(--surface-card);
  scroll-margin-top: 72px;
}

.gr-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: var(--s-2);
  border-bottom: 1px solid var(--line);
}

.gr-tab {
  display: inline-flex;
  align-items: center;
  gap: var(--s-2);
  min-height: 36px;
  padding: 0 var(--s-3);
  border: 0;
  border-radius: var(--r-2);
  background: transparent;
  font: 500 14px/1 var(--font-sans);
  color: var(--mute);
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
}

.gr-tab:hover {
  color: var(--fg);
}

.gr-tab--on {
  background: var(--surface-3);
  color: var(--fg);
}

.gr-tab__count {
  font: 400 12px/1 var(--font-mono);
  color: var(--mute);
}

.gr-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.gr-list li + li {
  border-top: 1px solid var(--line);
}

.gr-row {
  display: grid;
  grid-template-columns: minmax(180px, 1.2fr) 64px minmax(0, 2fr) 84px 20px;
  align-items: center;
  gap: var(--s-4);
  min-height: 52px;
  padding: 0 var(--s-5);
  color: var(--fg);
  transition: background-color 0.15s ease;
}

.gr-row:hover {
  background: var(--surface-2);
}

.gr-row__kind {
  font: 600 14px/1.3 var(--font-sans);
}

.gr-row__ext {
  margin-left: var(--s-2);
  font: 400 12px var(--font-mono);
  color: var(--mute);
}

.gr-row__arch {
  justify-self: start;
  padding: 2px 8px;
  border-radius: var(--r-pill);
  background: var(--surface-3);
  font: 500 11.5px/1.4 var(--font-mono);
  color: var(--dim);
}

.gr-row__arch:empty {
  visibility: hidden;
}

.gr-row__name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font: 400 12.5px var(--font-mono);
  color: var(--mute);
}

.gr-row__size {
  font: 400 13px var(--font-mono);
  color: var(--dim);
  text-align: right;
}

.gr-row__icon {
  color: var(--mute);
}

.gr-row:hover .gr-row__icon {
  color: var(--accent);
}

.gr-older {
  display: flex;
  flex-direction: column;
  gap: var(--s-3);
}

.gr-release {
  border: 1px solid var(--line);
  border-radius: var(--r-4);
  background: var(--surface-card);
}

.gr-release summary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--s-2) var(--s-4);
  min-height: 56px;
  padding: 0 var(--s-5);
  cursor: pointer;
  list-style: none;
}

.gr-release summary::-webkit-details-marker {
  display: none;
}

.gr-release summary::after {
  content: '+';
  margin-left: auto;
  font: 400 18px/1 var(--font-mono);
  color: var(--mute);
}

.gr-release[open] summary::after {
  content: '−';
}

.gr-release__tag {
  font: 800 18px/1.2 var(--font-sans);
  letter-spacing: -0.03em;
  color: var(--fg);
}

.gr-release__meta {
  font: 400 13px/1.4 var(--font-sans);
  color: var(--mute);
}

.gr-release__body {
  display: flex;
  flex-direction: column;
  gap: var(--s-5);
  padding: var(--s-2) var(--s-5) var(--s-5);
  border-top: 1px solid var(--line);
}

.gr-release__body > .gr-notes {
  padding-top: var(--s-4);
}

.gr-release__group {
  display: flex;
  flex-direction: column;
  gap: var(--s-2);
}

.gr-list--flat {
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: var(--r-3);
  background: var(--surface-1);
}

@media (max-width: 760px) {
  .gr-latest__notes {
    border-left: 0;
    border-top: 1px solid var(--line);
  }

  .gr-latest__tag {
    font-size: 40px;
  }

  .gr-row {
    grid-template-columns: minmax(0, 1fr) auto auto;
    padding: var(--s-3) var(--s-4);
  }

  .gr-row__name,
  .gr-row__icon {
    display: none;
  }
}
</style>
