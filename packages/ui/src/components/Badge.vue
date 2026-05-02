<script setup lang="ts">
defineProps<{
	variant?: 'brand' | 'soft' | 'green' | 'warn' | 'err' | 'mono'
	dot?: 'ok' | 'warn' | 'err' | 'info'
}>()
</script>

<template>
	<span v-if="dot" class="bx-status-chip">
		<span class="bx-status-chip__dot" :class="`bx-status-chip__dot--${dot}`" />
		<slot />
	</span>
	<span v-else class="bx-badge" :class="`bx-badge--${variant ?? 'soft'}`">
		<slot />
	</span>
</template>

<style scoped>
.bx-badge {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	font: 600 11px var(--font-sans);
	padding: 3px 9px;
	border-radius: var(--r-full);
}

.bx-badge--brand {
	background: var(--brand);
	color: var(--bg-0);
}
.bx-badge--soft {
	background: var(--brand-soft);
	color: var(--brand);
	border: 1px solid color-mix(in oklab, var(--brand) 40%, transparent);
}
.bx-badge--green {
	background: var(--brand-soft-2);
	color: var(--brand-2);
	border: 1px solid color-mix(in oklab, var(--brand-2) 40%, transparent);
}
.bx-badge--warn {
	background: color-mix(in oklab, var(--warn) 18%, transparent);
	color: var(--warn);
	border: 1px solid color-mix(in oklab, var(--warn) 40%, transparent);
}
.bx-badge--err {
	background: color-mix(in oklab, var(--err) 18%, transparent);
	color: var(--err);
	border: 1px solid color-mix(in oklab, var(--err) 40%, transparent);
}
.bx-badge--mono {
	font: 500 10.5px var(--font-mono);
	background: var(--bg-3);
	color: var(--dim);
	border: 1px solid var(--line);
	border-radius: var(--r-xs);
	padding: 2px 6px;
}

.bx-status-chip {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	font: 500 11.5px var(--font-sans);
	color: var(--dim);
}

.bx-status-chip__dot {
	width: 6px;
	height: 6px;
	border-radius: 50%;
	flex-shrink: 0;
}
.bx-status-chip__dot--ok   { background: var(--ok);   box-shadow: 0 0 6px var(--ok); }
.bx-status-chip__dot--warn { background: var(--warn);  box-shadow: 0 0 6px var(--warn); }
.bx-status-chip__dot--err  { background: var(--err);   box-shadow: 0 0 6px var(--err); }
.bx-status-chip__dot--info { background: var(--info);  box-shadow: 0 0 6px var(--info); }
</style>
