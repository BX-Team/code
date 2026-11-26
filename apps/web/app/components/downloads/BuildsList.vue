<script setup lang="ts">
import { Button } from '@bx-team/ui';
import { Loader2 } from '@lucide/vue';
import { ref, watch } from 'vue';
import { BUILDS_PER_PAGE, type Build, fetchVersion, type ProjectSummary, type VersionSummary } from '@/lib/builds';
import BuildCard from './BuildCard.vue';
import VersionSelector from './VersionSelector.vue';

const props = defineProps<{
  project: ProjectSummary;
  versions: string[];
  defaultVersion: string;
  versionsMetadata: VersionSummary[];
  initialBuilds: Build[];
  initialNext: string | null;
  initialShowExperimental?: boolean;
}>();

const { t } = useI18n();
const selectedVersion = ref(props.defaultVersion);
const showExperimental = ref(!!props.initialShowExperimental);
const builds = ref<Build[]>(props.initialBuilds);
const next = ref<string | null>(props.initialNext);
const loading = ref(false);
const loadingMore = ref(false);
const error = ref<string | null>(null);

const experimental = computed(() => props.project.experimental ?? undefined);
const stableVersions = computed(() =>
  experimental.value ? props.versions.filter(v => v !== experimental.value) : props.versions,
);

function supportOf(version: string) {
  return props.versionsMetadata.find(m => m.version === version)?.support;
}

watch(selectedVersion, async version => {
  if (!version) return;
  loading.value = true;
  error.value = null;
  try {
    const page = await fetchVersion(props.project.key, version, BUILDS_PER_PAGE);
    builds.value = page.builds.items;
    next.value = page.builds.next;
  } catch (e: any) {
    error.value = e?.message ?? t('builds.failed');
    builds.value = [];
    next.value = null;
  } finally {
    loading.value = false;
  }
});

// The cursor is the only thing that says there is another page.
async function loadMore() {
  if (!next.value || loadingMore.value) return;
  loadingMore.value = true;
  try {
    const page = await fetchVersion(props.project.key, selectedVersion.value, BUILDS_PER_PAGE, next.value);
    builds.value = [...builds.value, ...page.builds.items];
    next.value = page.builds.next;
  } catch (e: any) {
    error.value = e?.message ?? t('builds.failed');
  } finally {
    loadingMore.value = false;
  }
}

function onToggle(value: boolean) {
  showExperimental.value = value;
  if (!value && selectedVersion.value === experimental.value) {
    selectedVersion.value = props.project.latest || props.defaultVersion;
  }
}
</script>

<template>
	<div>
		<VersionSelector
			:versions="showExperimental && experimental ? [experimental, ...stableVersions] : stableVersions"
			:selected-version="selectedVersion"
			:versions-metadata="versionsMetadata"
			:experimental-version="experimental"
			:show-experimental="showExperimental"
			@update:selected-version="selectedVersion = $event"
			@toggle-experimental="onToggle"
		/>

		<p v-if="selectedVersion === experimental" class="bx-callout bx-callout--exp notice">
			<span class="bx-callout__mark">{{ t('builds.experimental') }}</span>
			<span>{{ t('builds.experimentalBody') }}</span>
		</p>

		<p v-if="supportOf(selectedVersion) === 'deprecated'" class="bx-callout bx-callout--warn notice">
			<span class="bx-callout__mark">{{ t('builds.deprecated') }}</span>
			<span>{{ t('builds.deprecatedBody') }}</span>
		</p>

		<p v-if="supportOf(selectedVersion) === 'unsupported'" class="bx-callout bx-callout--err notice">
			<span class="bx-callout__mark">{{ t('builds.unsupported') }}</span>
			<span>{{ t('builds.unsupportedBody') }}</span>
		</p>

		<div v-if="loading" class="state">
			<Loader2 class="spin" :size="28" :stroke-width="1.7" />
			<p>{{ t('builds.loading') }}</p>
		</div>

		<p v-else-if="error" class="bx-callout bx-callout--err notice">
			<span class="bx-callout__mark">{{ t('builds.error') }}</span>
			<span>{{ error }}</span>
		</p>

		<div v-else-if="!builds.length" class="state">
			<p>{{ t('builds.none') }}</p>
		</div>

		<div v-else class="builds">
			<BuildCard v-for="b in builds" :key="b.build" :build="b" :project="project" />

			<div v-if="next" class="more">
				<Button variant="secondary" :disabled="loadingMore" @click="loadMore">
					<Loader2 v-if="loadingMore" class="spin" :size="16" :stroke-width="1.7" />
					{{ loadingMore ? t('common.loading') : t('builds.more') }}
				</Button>
			</div>
		</div>
	</div>
</template>

<style scoped>
.notice {
	margin-bottom: var(--s-4);
}

.state {
	display: grid;
	place-items: center;
	padding: 64px 16px;
	gap: 10px;
	color: var(--mute);
}
.spin { animation: spin 1s linear infinite; color: var(--mute); }
@keyframes spin { to { transform: rotate(360deg); } }

.builds { display: flex; flex-direction: column; gap: var(--s-4); }
.more { display: flex; justify-content: center; padding-top: 6px; }
</style>
