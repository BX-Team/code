<script setup lang="ts">
import { Calendar, ExternalLink, FileText, GitCommit, Package } from '@lucide/vue';
import { computed } from 'vue';
import { commitUrl, getChannelColor, type ProjectSummary, type Release } from '@/lib/builds';
import { formatDate } from '@/lib/format';
import { renderNotes } from '@/lib/markdown';
import DownloadFiles from './DownloadFiles.vue';

const props = defineProps<{
  release: Release;
  project: ProjectSummary;
}>();

const notes = computed(() => (props.release.notes ? renderNotes(props.release.notes) : ''));
const external = computed(() => !props.project.repo);
</script>

<template>
	<div class="card">
		<div class="title-row">
			<h3>{{ release.tag }}</h3>
			<span class="badge-channel" :class="getChannelColor(release.channel)">{{ release.channel }}</span>
		</div>
		<div class="meta">
			<div><Calendar :size="14" :stroke-width="1.7" /><span>{{ formatDate(release.created_at) }}</span></div>
		</div>

		<div v-if="notes" class="section">
			<h4><FileText :size="14" :stroke-width="1.7" /> Release notes</h4>
			<!-- eslint-disable-next-line vue/no-v-html -- sanitised in renderNotes; see app/lib/markdown.ts -->
			<div class="notes" v-html="notes" />
		</div>

		<div v-if="release.commits.length" class="section">
			<h4><GitCommit :size="14" :stroke-width="1.7" /> Commits</h4>
			<ul>
				<li v-for="c in release.commits" :key="c.sha">
					<NuxtLink
						:to="commitUrl(project, c.sha)"
						:target="external ? '_blank' : undefined"
						:rel="external ? 'noopener noreferrer' : undefined"
						class="sha-link"
					>
						<code>{{ c.sha.substring(0, 7) }}</code>
						<ExternalLink v-if="external" :size="11" :stroke-width="1.8" />
					</NuxtLink>
					<span>{{ c.summary }}</span>
				</li>
			</ul>
		</div>

		<div class="section">
			<h4><Package :size="14" :stroke-width="1.7" /> Files</h4>
			<DownloadFiles :downloads="release.downloads" />
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

.title-row {
	display: flex;
	align-items: center;
	gap: 10px;
	margin-bottom: 8px;
	flex-wrap: wrap;
}
.title-row h3 { margin: 0; font-size: 18px; font-weight: 700; color: var(--fg-hi); }

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
	text-transform: uppercase;
}
.channel-stable { background: color-mix(in oklab, var(--ch-stable) 15%, transparent); color: var(--ch-stable); border-color: color-mix(in oklab, var(--ch-stable) 30%, transparent); }
.channel-beta { background: color-mix(in oklab, var(--ch-beta) 15%, transparent); color: var(--ch-beta); border-color: color-mix(in oklab, var(--ch-beta) 30%, transparent); }
.channel-alpha { background: color-mix(in oklab, var(--ch-alpha) 15%, transparent); color: var(--ch-alpha); border-color: color-mix(in oklab, var(--ch-alpha) 30%, transparent); }
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

.notes { color: var(--dim); font-size: 14px; line-height: 1.65; overflow-wrap: break-word; }
.notes :deep(> :first-child) { margin-top: 0; }
.notes :deep(> :last-child) { margin-bottom: 0; }
.notes :deep(h1), .notes :deep(h2), .notes :deep(h3), .notes :deep(h4) {
	color: var(--fg-hi);
	font-size: 15px;
	font-weight: 600;
	margin: 18px 0 8px;
}
.notes :deep(p) { margin: 0 0 10px; }
.notes :deep(ul), .notes :deep(ol) { margin: 0 0 10px; padding-left: 20px; }
.notes :deep(li) { margin: 3px 0; }
.notes :deep(ul) { list-style: disc; }
.notes :deep(ul ul) { list-style: circle; }
.notes :deep(ol) { list-style: decimal; }
.notes :deep(ol ol) { list-style: lower-alpha; }
.notes :deep(img) { display: inline-block; max-width: 100%; height: auto; vertical-align: middle; }
.notes :deep(a) { color: var(--brand); }
.notes :deep(a:hover) { text-decoration: underline; }
.notes :deep(code) {
	font-family: var(--font-mono);
	font-size: 12.5px;
	background: var(--bg-2);
	padding: 1px 5px;
	border-radius: 4px;
}
.notes :deep(pre) {
	background: var(--bg-2);
	border: 1px solid var(--line);
	border-radius: 8px;
	padding: 12px;
	overflow-x: auto;
	margin: 0 0 10px;
}
.notes :deep(pre code) { background: none; padding: 0; }
.notes :deep(hr) { border: 0; border-top: 1px solid var(--line); margin: 16px 0; }
.notes :deep(blockquote) {
	margin: 0 0 10px;
	padding-left: 12px;
	border-left: 2px solid var(--line-2);
	color: var(--mute);
}
</style>
