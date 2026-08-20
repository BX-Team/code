<script setup lang="ts">
defineProps<{
  variant?: 'primary' | 'accent' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  href?: string;
  disabled?: boolean;
}>();
</script>

<template>
	<component
		:is="href ? 'a' : 'button'"
		:href="href"
		:disabled="disabled"
		class="bx-btn"
		:class="[`bx-btn--${variant ?? 'primary'}`, size && size !== 'md' ? `bx-btn--${size}` : '']"
	>
		<slot />
	</component>
</template>

<style scoped>
.bx-btn {
	display: inline-flex;
	align-items: center;
	gap: 8px;
	padding: 9px 18px;
	border-radius: var(--r-full);
	font: 500 14px/1 var(--font-sans);
	font-family: inherit;
	border: 1px solid transparent;
	cursor: pointer;
	transition: all 0.15s;
	white-space: nowrap;
	text-decoration: none;
}

.bx-btn--sm { padding: 6px 12px; font-size: 13px; }
.bx-btn--lg { padding: 12px 22px; font-size: 15px; }

.bx-btn:disabled {
	opacity: 0.45;
	cursor: not-allowed;
	pointer-events: none;
}

.bx-btn--primary {
	background: var(--fg-hi);
	color: var(--bg-0);
}
.bx-btn--primary:hover {
	background: var(--fg);
}

.bx-btn--accent {
	background: var(--brand);
	color: var(--bg-0);
}
.bx-btn--accent:hover {
	box-shadow: var(--shadow-glow);
}

.bx-btn--secondary {
	background: transparent;
	color: var(--fg);
	border-color: var(--line-2);
}
.bx-btn--secondary:hover {
	color: var(--fg-hi);
	border-color: var(--dim);
}

.bx-btn--ghost {
	background: transparent;
	color: var(--dim);
	padding: 9px 14px;
}
.bx-btn--ghost:hover {
	color: var(--fg-hi);
	background: var(--hover);
}
.bx-btn--ghost.bx-btn--sm { padding: 5px 10px; }
</style>
