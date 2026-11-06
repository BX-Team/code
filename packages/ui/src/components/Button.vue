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
	height: 38px;
	padding: 0 var(--s-4);
	border-radius: var(--r-2);
	font: 500 14px/1 var(--font-sans);
	border: 1px solid transparent;
	cursor: pointer;
	white-space: nowrap;
	text-decoration: none;
	transition:
		background-color 0.15s ease,
		color 0.15s ease,
		border-color 0.15s ease,
		opacity 0.15s ease;
}

.bx-btn--sm { height: 30px; padding: 0 var(--s-3); border-radius: var(--r-1); font-size: 13px; }
.bx-btn--lg { height: 44px; padding: 0 30px; font-size: 15px; }

.bx-btn:disabled {
	opacity: 0.5;
	cursor: not-allowed;
	pointer-events: none;
}

.bx-btn--primary {
	background: var(--fg);
	color: var(--surface-deep);
	font-weight: 700;
}
.bx-btn--lg.bx-btn--primary {
	font-weight: 800;
}
.bx-btn--primary:hover {
	opacity: 0.88;
}
.bx-btn--primary:active {
	opacity: 0.8;
}

.bx-btn--accent {
	background: var(--surface-3);
	color: var(--fg);
}
.bx-btn--accent:hover {
	background: var(--line-2);
}

.bx-btn--secondary {
	background: transparent;
	color: var(--fg);
	border-color: var(--line-2);
}
.bx-btn--secondary:hover {
	background: var(--surface-2);
}

.bx-btn--ghost {
	background: transparent;
	color: var(--mute);
	padding: 0 var(--s-3);
}
.bx-btn--ghost:hover {
	color: var(--fg);
	background: var(--surface-2);
}
</style>
