<script setup lang="ts">
import { Button } from '@bx-team/ui';
import { AlertCircle, AlertTriangle, FlaskConical, Loader2, XCircle } from '@lucide/vue';
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
    error.value = e?.message ?? 'Failed to load builds';
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
    error.value = e?.message ?? 'Failed to load builds';
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

		<div v-if="selectedVersion === experimental" class="banner banner-info">
			<FlaskConical :size="16" :stroke-width="1.7" class="banner-icon" />
			<div>
				<strong>Experimental Build</strong>
				<p>Experimental builds may contain bugs or unstable features. Not recommended for production servers.</p>
			</div>
		</div>

		<div v-if="supportOf(selectedVersion) === 'deprecated'" class="banner banner-warn">
			<AlertTriangle :size="16" :stroke-width="1.7" class="banner-icon" />
			<div>
				<strong>Deprecated Version</strong>
				<p>This Minecraft version is deprecated. Consider upgrading to a newer version.</p>
			</div>
		</div>

		<div v-if="supportOf(selectedVersion) === 'unsupported'" class="banner banner-err">
			<XCircle :size="16" :stroke-width="1.7" class="banner-icon" />
			<div>
				<strong>Unsupported Version</strong>
				<p>This Minecraft version is no longer supported. Please upgrade to a supported version.</p>
			</div>
		</div>

		<div v-if="loading" class="state">
			<Loader2 class="spin" :size="28" :stroke-width="1.7" />
			<p>Loading builds…</p>
		</div>

		<div v-else-if="error" class="banner banner-err">
			<AlertCircle :size="16" :stroke-width="1.7" class="banner-icon" />
			<div><p>{{ error }}</p></div>
		</div>

		<div v-else-if="!builds.length" class="state">
			<p>No builds available for this version.</p>
		</div>

		<div v-else class="builds">
			<BuildCard v-for="b in builds" :key="b.build" :build="b" :project="project" />

			<div v-if="next" class="more">
				<Button variant="secondary" :disabled="loadingMore" @click="loadMore">
					<Loader2 v-if="loadingMore" class="spin" :size="16" :stroke-width="1.7" />
					{{ loadingMore ? 'Loading…' : 'Load more builds' }}
				</Button>
			</div>
		</div>
	</div>
</template>

<style scoped>
.banner {
	display: flex;
	align-items: flex-start;
	gap: 12px;
	padding: 12px 16px;
	border-radius: 10px;
	border: 1px solid;
	margin-bottom: 14px;
	font-size: 13px;
	line-height: 1.5;
}
.banner strong { display: block; font-weight: 600; margin-bottom: 2px; }
.banner p { margin: 0; opacity: 0.85; }
.banner-icon { flex-shrink: 0; margin-top: 1px; }

.banner-info {
	background: color-mix(in oklab, var(--info) 10%, transparent);
	border-color: color-mix(in oklab, var(--info) 25%, transparent);
	color: var(--info);
}
.banner-warn {
	background: color-mix(in oklab, var(--warn) 10%, transparent);
	border-color: color-mix(in oklab, var(--warn) 25%, transparent);
	color: var(--warn);
}
.banner-err {
	background: color-mix(in oklab, var(--err) 10%, transparent);
	border-color: color-mix(in oklab, var(--err) 25%, transparent);
	color: var(--err);
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

.builds { display: flex; flex-direction: column; gap: 12px; }
.more { display: flex; justify-content: center; padding-top: 6px; }
</style>
