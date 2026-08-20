<script setup lang="ts">
import { Button } from '@bx-team/ui';
import { Calendar, Download, ExternalLink, GitCommit, Package } from '@lucide/vue';
import { type Build, formatDate, formatFileSize, getChannelColor } from '@/lib/atlas';
import { GITHUB_URL } from '~/config/links';

const props = defineProps<{
  build: Build;
  projectName: string;
  version: string;
}>();

function dl() {
  window.open(props.build.downloads.application.url, '_blank');
}
</script>

<template>
	<div class="card">
		<div class="card-head">
			<div>
				<div class="title-row">
					<h3>Build #{{ build.id }}</h3>
					<span class="badge-channel" :class="getChannelColor(build.channel)">{{ build.channel }}</span>
				</div>
				<div class="meta">
					<div><Calendar :size="14" :stroke-width="1.7" /><span>{{ formatDate(build.time) }}</span></div>
					<div><Package :size="14" :stroke-width="1.7" /><span>{{ formatFileSize(build.downloads.application.size) }}</span></div>
				</div>
			</div>
			<Button variant="primary" @click="dl">
				<Download :size="16" :stroke-width="1.7" /> Download
			</Button>
		</div>

		<div v-if="build.commits?.length" class="section">
			<h4><GitCommit :size="14" :stroke-width="1.7" /> Commits</h4>
			<ul>
				<li v-for="c in build.commits" :key="c.sha">
					<a :href="`${GITHUB_URL}/${projectName}/commit/${c.sha}`" target="_blank" rel="noopener noreferrer" class="sha-link">
						<code>{{ c.sha.substring(0, 7) }}</code>
						<ExternalLink :size="11" :stroke-width="1.8" />
					</a>
					<span>{{ c.message }}</span>
				</li>
			</ul>
		</div>

		<div class="section file-info">
			<div><span>File</span><code>{{ build.downloads.application.name }}</code></div>
			<div><span>SHA-256</span><code>{{ build.downloads.application.checksums.sha256.substring(0, 16) }}…</code></div>
		</div>
	</div>
</template>

<style scoped>
.card {
	border: 1px solid var(--line);
	border-radius: 12px;
	padding: 20px;
	background: color-mix(in oklab, var(--bg-1) 55%, transparent);
	transition: border-color .15s;
}
.card:hover { border-color: var(--line-2); }

.card-head {
	display: flex;
	gap: 14px;
	justify-content: space-between;
	align-items: flex-start;
	flex-wrap: wrap;
}

.title-row {
	display: flex;
	align-items: center;
	gap: 10px;
	margin-bottom: 8px;
	flex-wrap: wrap;
}
.title-row h3 { margin: 0; font-size: 16px; font-weight: 600; color: var(--fg-hi); }

.meta { display: flex; gap: 16px; flex-wrap: wrap; color: var(--mute); font-size: 13px; }
.meta div { display: inline-flex; align-items: center; gap: 6px; }

.badge-channel {
	display: inline-block;
	padding: 2px 8px;
	border-radius: 4px;
	border: 1px solid;
	font-family: var(--font-mono);
	font-size: 11px;
	font-weight: 600;
}
.channel-stable { background: color-mix(in oklab, var(--ch-stable) 15%, transparent); color: var(--ch-stable); border-color: color-mix(in oklab, var(--ch-stable) 30%, transparent); }
.channel-beta { background: color-mix(in oklab, var(--ch-beta) 15%, transparent); color: var(--ch-beta); border-color: color-mix(in oklab, var(--ch-beta) 30%, transparent); }
.channel-alpha { background: color-mix(in oklab, var(--ch-alpha) 15%, transparent); color: var(--ch-alpha); border-color: color-mix(in oklab, var(--ch-alpha) 30%, transparent); }
.channel-experimental { background: color-mix(in oklab, var(--ch-experimental) 15%, transparent); color: var(--ch-experimental); border-color: color-mix(in oklab, var(--ch-experimental) 30%, transparent); }
.channel-default { background: var(--bg-2); color: var(--dim); border-color: var(--line-2); }

.section { margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--line); }
.section h4 {
	display: flex;
	align-items: center;
	gap: 6px;
	margin: 0 0 10px;
	font-size: 12px;
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: .07em;
	color: var(--mute);
}
.section ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; }
.section li { font-size: 13px; color: var(--mute); display: flex; gap: 8px; align-items: baseline; flex-wrap: wrap; }

.sha-link {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	background: var(--bg-2);
	padding: 2px 6px;
	border-radius: 4px;
	font-family: var(--font-mono);
	font-size: 11px;
	color: var(--dim);
	flex-shrink: 0;
	transition: background .15s, color .15s;
}
.sha-link:hover { background: var(--bg-3); color: var(--fg-hi); }

.file-info {
	font-size: 12px;
	color: var(--mute);
	display: flex;
	flex-direction: column;
	gap: 6px;
}
.file-info div {
	display: flex;
	justify-content: space-between;
	gap: 12px;
}
.file-info span { color: var(--mute); flex-shrink: 0; }
.file-info code { font-family: var(--font-mono); color: var(--dim); word-break: break-all; text-align: right; }
</style>
