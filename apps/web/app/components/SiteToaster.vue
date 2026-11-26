<script setup lang="ts">
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from '@lucide/vue';
import { h } from 'vue';
import { Toaster } from 'vue-sonner';
import 'vue-sonner/style.css';

/** Lucide at the toast's size, so the icons match the rest of the site. */
const icon =
  (component: typeof X, size = 16) =>
  () =>
    h(component, { size, strokeWidth: 1.9 });

const icons = {
  error: icon(CircleAlert),
  success: icon(CircleCheck),
  info: icon(Info),
  warning: icon(TriangleAlert),
  close: icon(X, 13),
};
</script>

<template>
	<ClientOnly>
		<Toaster
			theme="dark"
			position="bottom-right"
			close-button
			:icons="icons"
			:duration="5000"
			:toast-options="{ class: 'bx-toast' }"
		/>
	</ClientOnly>
</template>

<style>
/* Sonner's own layout and motion, in the site's colours and shapes. */
[data-sonner-toaster] {
	--normal-bg: var(--surface-card);
	--normal-border: var(--line-2);
	--normal-text: var(--fg-hi);
	--border-radius: var(--r-3);
	--width: 380px;
	font-family: var(--font-sans);
}

[data-sonner-toast].bx-toast {
	gap: 10px;
	padding: 13px 16px;
	box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45);
	font: 500 13.5px/1.45 var(--font-sans);
}

[data-sonner-toast].bx-toast [data-description] {
	color: var(--dim);
	font-weight: 400;
}

[data-sonner-toast].bx-toast[data-type="error"] [data-icon] {
	color: var(--err);
}

[data-sonner-toast].bx-toast[data-type="success"] [data-icon] {
	color: var(--ok);
}

[data-sonner-toast].bx-toast[data-type="warning"] [data-icon] {
	color: var(--warn);
}

[data-sonner-toast].bx-toast[data-type="info"] [data-icon] {
	color: var(--accent);
}

[data-sonner-toast].bx-toast [data-close-button] {
	border-color: var(--line-2);
	background: var(--surface-2);
	color: var(--mute);
}

[data-sonner-toast].bx-toast [data-close-button]:hover {
	background: var(--surface-3);
	color: var(--fg-hi);
}
</style>
