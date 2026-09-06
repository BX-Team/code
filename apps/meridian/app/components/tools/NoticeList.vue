<script setup lang="ts">
import { AlertTriangle, Info } from '@lucide/vue';
import type { Notice } from '@/lib/notice';

defineProps<{ notices: Notice[]; columns?: boolean }>();
</script>

<template>
	<div v-if="notices.length" class="notices" :class="{ columns }">
		<article v-for="notice in notices" :key="notice.title" class="notice" :class="notice.level">
			<component :is="notice.level === 'warning' ? AlertTriangle : Info" :size="15" :stroke-width="1.8" />
			<div>
				<h4>{{ notice.title }}</h4>
				<p>{{ notice.body }}</p>
			</div>
		</article>
	</div>
</template>

<style scoped>
.notices {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.notices.columns {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
	align-items: start;
}

@media (max-width: 640px) {
	.notices.columns {
		grid-template-columns: 1fr;
	}
}

.notice {
	display: flex;
	gap: 10px;
	padding: 12px 14px;
	border: 1px solid var(--line);
	border-radius: var(--r-md);
	background: var(--bg-1);
}

.notice.warning {
	border-color: color-mix(in oklab, var(--warn) 30%, var(--line));
	color: var(--warn);
}

.notice.info {
	color: var(--info);
}

.notice svg {
	flex: none;
	margin-top: 2px;
}

.notice h4 {
	margin: 0 0 3px;
	font: 600 13px/1.4 var(--font-sans);
	color: var(--fg-hi);
}

.notice p {
	margin: 0;
	font: 400 13px/1.6 var(--font-sans);
	color: var(--dim);
}
</style>
