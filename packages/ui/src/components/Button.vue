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
	justify-content: center;
	gap: var(--s-2);
	height: 40px;
	padding: 0 var(--s-4);
	border-radius: var(--r-1);
	font: 400 14px/1 var(--font-mono);
	border: 1px solid transparent;
	cursor: pointer;
	white-space: nowrap;
	text-decoration: none;
	transition:
		background-color 0.15s ease,
		color 0.15s ease,
		border-color 0.15s ease;
}

.bx-btn--sm { height: 32px; padding: 0 var(--s-3); font-size: 13px; }
.bx-btn--lg { height: 44px; padding: 0 var(--s-5); font-size: 15px; }

.bx-btn:disabled {
	opacity: 0.45;
	cursor: not-allowed;
	pointer-events: none;
}

.bx-btn--primary {
	background: var(--fg);
	color: var(--surface-deep);
}
.bx-btn--primary:hover {
	background: var(--fg-hi);
}

.bx-btn--accent {
	background: var(--mute);
	color: var(--surface-deep);
}
.bx-btn--accent:hover {
	background: var(--dim);
}

.bx-btn--secondary {
	background: var(--surface-deep);
	color: var(--fg);
	border-color: var(--edge);
}
.bx-btn--secondary:hover {
	border-color: var(--fg);
	background: var(--surface-2);
}

.bx-btn--ghost {
	background: transparent;
	color: var(--dim);
	padding: 0 var(--s-3);
}
.bx-btn--ghost:hover {
	color: var(--fg-hi);
	background: var(--surface-2);
}
</style>
