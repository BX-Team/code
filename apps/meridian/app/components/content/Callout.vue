<script setup lang="ts">
type CalloutKind = 'info' | 'warn' | 'ok' | 'error'

const props = withDefaults(defineProps<{
	type?: string
	title?: string
}>(), {
	type: 'info',
	title: '',
})

const kind = computed<CalloutKind>(() => {
	const t = (props.type || '').toLowerCase()
	if (['warn', 'warning', 'caution'].includes(t)) return 'warn'
	if (['ok', 'success', 'tip', 'check', 'idea'].includes(t)) return 'ok'
	if (['error', 'danger', 'destructive'].includes(t)) return 'error'
	return 'info'
})
</script>

<template>
	<div class="callout" :class="kind">
		<span class="ico" aria-hidden="true">
			<slot name="icon">
				<svg v-if="kind === 'info'" width="18" height="18" viewBox="0 0 24 24" fill="none"
					stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
					<circle cx="12" cy="12" r="9"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
				</svg>
				<svg v-else-if="kind === 'warn'" width="18" height="18" viewBox="0 0 24 24" fill="none"
					stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
					<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
					<line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
				</svg>
				<svg v-else-if="kind === 'ok'" width="18" height="18" viewBox="0 0 24 24" fill="none"
					stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
					<polyline points="20 6 9 17 4 12"/>
				</svg>
				<svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none"
					stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
					<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
				</svg>
			</slot>
		</span>
		<span class="body">
			<slot name="title">
				<strong v-if="title">{{ title }}</strong>
			</slot>
			<slot />
		</span>
	</div>
</template>

<style scoped>
.callout {
	display: grid;
	grid-template-columns: 22px 1fr;
	gap: 10px;
	align-items: start;
	padding: 14px 16px;
	border: 1px solid var(--line);
	border-radius: 10px;
	margin: 22px 0;
	background: var(--bg-1);
}
.callout .ico { color: var(--brand); padding-top: 2px; }
.callout .body {
	font-size: 14px;
	line-height: 1.55;
	color: var(--fg);
	min-width: 0;
}
.callout .body :deep(p) { margin: 0 0 8px; }
.callout .body :deep(p:last-child) { margin: 0; }
.callout .body :deep(strong) { color: var(--fg-hi); font-weight: 600; margin-right: 4px; }
.callout .body :deep(a) { color: var(--brand); }
.callout .body :deep(code) {
	font: 500 13px var(--font-mono);
	color: var(--fg-hi);
	background: var(--bg-2);
	border: 1px solid var(--line);
	padding: 1px 5px;
	border-radius: 3px;
}
.callout .body :deep(pre) {
	background: var(--bg-0, oklch(0.10 0.005 240));
	border: 1px solid var(--line);
	border-radius: 8px;
	padding: 12px 14px;
	margin: 8px 0;
	overflow-x: auto;
	font: 400 12px/1.6 var(--font-mono);
	white-space: pre;
}
.callout .body :deep(pre code) {
	background: none;
	border: none;
	padding: 0;
	font-size: inherit;
	color: inherit;
}
.callout .body :deep(ol),
.callout .body :deep(ul) {
	margin: 4px 0 8px;
}
.callout .body :deep(li) {
	margin: 2px 0;
	line-height: 1.55;
}

.callout.info {
	border-color: color-mix(in oklab, var(--brand) 35%, var(--line));
	background: color-mix(in oklab, var(--brand-soft) 25%, var(--bg-1));
}
.callout.info .ico { color: var(--brand); }

.callout.warn {
	border-color: color-mix(in oklab, var(--warn) 35%, var(--line));
	background: color-mix(in oklab, var(--warn) 8%, var(--bg-1));
}
.callout.warn .ico { color: var(--warn); }

.callout.ok {
	border-color: color-mix(in oklab, var(--brand-2) 35%, var(--line));
	background: color-mix(in oklab, var(--brand-2) 8%, var(--bg-1));
}
.callout.ok .ico { color: var(--brand-2); }

.callout.error {
	border-color: color-mix(in oklab, var(--err) 35%, var(--line));
	background: color-mix(in oklab, var(--err) 8%, var(--bg-1));
}
.callout.error .ico { color: var(--err); }
</style>
