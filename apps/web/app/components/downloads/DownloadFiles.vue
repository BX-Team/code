<script setup lang="ts">
import { Button } from '@bx-team/ui';
import { Download } from '@lucide/vue';
import { downloadEntries, type Download as File } from '@/lib/builds';
import { formatBytes } from '@/lib/format';

const props = defineProps<{
  downloads: Record<string, File>;
}>();

const files = computed(() => downloadEntries(props.downloads));
</script>

<template>
	<div v-if="files.length" class="files">
		<div v-for="[key, file] in files" :key="key" class="file">
			<div class="file-main">
				<code class="file-name">{{ file.name }}</code>
				<div class="file-meta">
					<span>{{ formatBytes(file.size) }}</span>
					<span class="dot">·</span>
					<code class="sha" :title="file.sha256">{{ file.sha256.substring(0, 16) }}…</code>
				</div>
			</div>
			<Button :href="file.url" target="_blank" rel="noopener noreferrer" variant="secondary" size="sm">
				<Download :size="14" :stroke-width="1.7" /> Download
			</Button>
		</div>
	</div>
</template>

<style scoped>
.files { display: flex; flex-direction: column; gap: 8px; }

.file {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	flex-wrap: wrap;
	padding: 10px 12px;
	border: 1px solid var(--line);
	border-radius: 8px;
	background: color-mix(in oklab, var(--bg-2) 45%, transparent);
}

.file-main { min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.file-name { font-family: var(--font-mono); font-size: 13px; color: var(--fg-hi); word-break: break-all; }
.file-meta { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--mute); }
.dot { opacity: .6; }
.sha { font-family: var(--font-mono); font-size: 11px; color: var(--dim); }
</style>
