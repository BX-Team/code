<script setup lang="ts">
defineProps<{
  variant?: 'brand' | 'soft' | 'green' | 'warn' | 'err' | 'mono';
  dot?: 'ok' | 'warn' | 'err' | 'info';
}>();
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
	font: 500 11px/1 var(--font-mono);
	padding: 4px 7px;
	border-radius: var(--r-1);
	border: 1px solid var(--line-2);
	background: var(--surface-1);
	color: var(--dim);
}

.bx-badge--brand {
	color: var(--accent);
}
.bx-badge--soft {
	color: var(--dim);
}
.bx-badge--green {
	background: var(--accent-wash);
	border-color: var(--accent-wash);
	color: var(--accent-2);
}
.bx-badge--warn {
	color: var(--warn);
}
.bx-badge--err {
	color: var(--err);
}
.bx-badge--mono {
	color: var(--mute);
}

.bx-status-chip {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	font: 500 11px/1 var(--font-mono);
	letter-spacing: 0.08em;
	text-transform: uppercase;
	color: var(--dim);
}

.bx-status-chip__dot {
	width: 6px;
	height: 6px;
	border-radius: var(--r-pill);
	flex-shrink: 0;
}
.bx-status-chip__dot--ok   { background: var(--ok); }
.bx-status-chip__dot--warn { background: var(--warn); }
.bx-status-chip__dot--err  { background: var(--err); }
.bx-status-chip__dot--info { background: var(--info); }
</style>
