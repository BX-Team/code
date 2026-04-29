<script setup lang="ts">
import { ref, watch } from 'vue'
import { AlertCircle, AlertTriangle, FlaskConical, Loader2, XCircle } from 'lucide-vue-next'
import type { Build, VersionWithBuilds } from '@/lib/atlas'
import VersionSelector from './VersionSelector.vue'
import AtlasBuildCard from './AtlasBuildCard.vue'

const props = defineProps<{
  projectId: string
  projectName: string
  initialVersions: string[]
  defaultVersion: string
  versionsMetadata?: VersionWithBuilds[]
  experimentalVersion?: string
  initialBuilds?: Build[]
}>()

const selectedVersion = ref(props.defaultVersion)
const showExperimental = ref(false)
const builds = ref<Build[]>(props.initialBuilds ?? [])
const loading = ref(false)
const error = ref<string | null>(null)

const stableVersions = props.experimentalVersion
  ? props.initialVersions.filter(v => v !== props.experimentalVersion)
  : props.initialVersions

function getStatus(v: string) {
  return props.versionsMetadata?.find(m => m.version.id === v)?.version.support.status
}

watch(selectedVersion, async (v) => {
  if (!v) return
  loading.value = true
  error.value = null
  try {
    const data = await $fetch<Build[]>(`/api/v2/projects/${props.projectId}/versions/${v}/builds`)
    builds.value = data
  } catch (e: any) {
    error.value = e?.message ?? 'Failed to load builds'
  } finally {
    loading.value = false
  }
})

function onToggle(v: boolean) {
  showExperimental.value = v
  if (!v && selectedVersion.value === props.experimentalVersion) {
    selectedVersion.value = props.defaultVersion
  }
}
</script>

<template>
  <div>
    <VersionSelector
      :versions="showExperimental && experimentalVersion ? [experimentalVersion, ...stableVersions] : stableVersions"
      :selected-version="selectedVersion"
      :versions-metadata="versionsMetadata"
      :experimental-version="experimentalVersion"
      :show-experimental="showExperimental"
      @update:selected-version="selectedVersion = $event"
      @toggle-experimental="onToggle"
    />

    <div v-if="selectedVersion === experimentalVersion" class="banner banner-info">
      <FlaskConical :size="18" :stroke-width="1.7" />
      <div>
        <h4>Experimental Build</h4>
        <p>Experimental builds may contain bugs or unstable features. Not recommended for production servers.</p>
      </div>
    </div>

    <div v-if="getStatus(selectedVersion) === 'DEPRECATED'" class="banner banner-warn">
      <AlertTriangle :size="18" :stroke-width="1.7" />
      <div>
        <h4>Deprecated Version</h4>
        <p>This Minecraft version is deprecated. Consider upgrading to a newer version.</p>
      </div>
    </div>

    <div v-if="getStatus(selectedVersion) === 'UNSUPPORTED'" class="banner banner-err">
      <XCircle :size="18" :stroke-width="1.7" />
      <div>
        <h4>Unsupported Version</h4>
        <p>This Minecraft version is no longer supported. Please upgrade to a supported version.</p>
      </div>
    </div>

    <div v-if="loading" class="state">
      <Loader2 class="spin" :size="28" :stroke-width="1.7" />
      <p>Loading builds…</p>
    </div>

    <div v-else-if="error" class="banner banner-err">
      <AlertCircle :size="18" :stroke-width="1.7" />
      <p>{{ error }}</p>
    </div>

    <div v-else-if="!builds.length" class="state">
      <p>No builds available for this version.</p>
    </div>

    <div v-else class="builds">
      <AtlasBuildCard
        v-for="b in builds"
        :key="b.id"
        :build="b"
        :project-name="projectName"
        :version="selectedVersion"
      />
    </div>
  </div>
</template>

<style scoped>
.banner {
  display: flex; align-items: flex-start; gap: 12px;
  padding: 14px 16px;
  border-radius: 10px;
  border: 1px solid;
  margin-bottom: 14px;
}
.banner h4 { margin: 0 0 4px; font-size: 13px; font-weight: 600; }
.banner p { margin: 0; font-size: 13px; line-height: 1.5; }
.banner-info { background: oklch(0.6 0.13 200 / .1); border-color: oklch(0.6 0.13 200 / .25); color: oklch(0.78 0.13 200); }
.banner-warn { background: oklch(0.62 0.14 75 / .1); border-color: oklch(0.62 0.14 75 / .25); color: oklch(0.82 0.14 75); }
.banner-err  { background: oklch(0.65 0.21 25 / .1); border-color: oklch(0.65 0.21 25 / .25); color: oklch(0.78 0.21 25); }

.state { display: grid; place-items: center; padding: 64px 16px; gap: 10px; color: var(--mute); }
.spin { animation: spin 1s linear infinite; color: var(--mute); }
@keyframes spin { to { transform: rotate(360deg); } }

.builds { display: flex; flex-direction: column; gap: 12px; }
</style>
