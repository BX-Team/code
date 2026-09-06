<script setup lang="ts">
import type { Applied } from '@/lib/serverconfig/build';

defineProps<{ changes: Applied[] }>();

const show = (value: unknown) => (Array.isArray(value) ? value.join(', ') : String(value));
</script>

<template>
	<ul v-if="changes.length" class="changes">
		<li v-for="change in changes" :key="change.path" class="change">
			<div class="head">
				<code class="path">{{ change.path }}</code>
				<span class="values">
					<span v-if="change.from !== null" class="from">{{ show(change.from) }}</span>
					<span v-else class="from unset">unset</span>
					<span class="arrow" aria-hidden="true">→</span>
					<span class="to">{{ show(change.value) }}</span>
					<span v-if="change.gameplay" class="tag">players notice</span>
				</span>
			</div>
			<p class="why">{{ change.why }}</p>
			<p v-if="change.description" class="doc">{{ change.description }}</p>
		</li>
	</ul>
</template>

<style scoped>
.changes {
	display: flex;
	flex-direction: column;
	margin: 0;
	padding: 0;
	list-style: none;
	border: 1px solid var(--line);
	border-radius: var(--r-lg);
	background: var(--bg-1);
	overflow: hidden;
}

.change {
	padding: 12px 14px;
	border-bottom: 1px solid var(--line);
	min-width: 0;
}

.change:last-child {
	border-bottom: 0;
}

.head {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 4px 12px;
	min-width: 0;
}

.path {
	flex: 1 1 auto;
	min-width: 0;
	font: 500 12.5px/1.6 var(--font-mono);
	color: var(--fg-hi);
	overflow-wrap: anywhere;
}

.values {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 4px 6px;
	min-width: 0;
	font: 500 12px/1.6 var(--font-mono);
}

.from,
.to {
	overflow-wrap: anywhere;
	min-width: 0;
}

.from {
	color: var(--mute);
	text-decoration: line-through;
}

.from.unset {
	text-decoration: none;
	font-style: italic;
}

.arrow {
	color: var(--mute);
}

.to {
	color: var(--fg-hi);
}

.tag {
	flex: none;
	padding: 1px 7px;
	border: 1px solid color-mix(in oklab, var(--warn) 30%, var(--line));
	border-radius: var(--r-full);
	font: 500 10.5px/1.7 var(--font-sans);
	text-transform: uppercase;
	letter-spacing: 0.06em;
	color: var(--warn);
	white-space: nowrap;
}

.why {
	margin: 5px 0 0;
	font: 400 13px/1.6 var(--font-sans);
	color: var(--dim);
}

.doc {
	margin: 4px 0 0;
	font: 400 12.5px/1.6 var(--font-sans);
	color: var(--mute);
}

@media (max-width: 560px) {
	.change {
		padding: 10px 12px;
	}

	/* Below this the key and its values cannot share a line without one of them
	   overflowing the card, so each gets its own. */
	.head {
		flex-direction: column;
		align-items: flex-start;
		gap: 2px;
	}

	.path,
	.values {
		flex: none;
		width: 100%;
		font-size: 11.5px;
	}

	.why,
	.doc {
		font-size: 12.5px;
	}
}
</style>
