<script setup lang="ts">
import { computed, ref, watch } from 'vue';

/** A BX ID's picture: the Discord or GitHub one when there is, else an initial on a tint of its own. */
const props = withDefaults(defineProps<{ id: string; name: string; image?: string | null; size?: number }>(), {
  image: null,
  size: 32,
});

const broken = ref(false);
watch(
  () => props.image,
  () => {
    broken.value = false;
  },
);

const initial = computed(() => (props.name.trim()[0] ?? '?').toUpperCase());

/** The same account always lands on the same point between the two accents. */
const tint = computed(() => {
  let hash = 0;
  for (const char of props.id) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  const at = Math.abs(hash) % 101;
  return `color-mix(in srgb, var(--accent-2) ${at}%, var(--accent))`;
});
</script>

<template>
	<img
		v-if="image && !broken"
		:src="image"
		alt=""
		class="avatar"
		:width="size"
		:height="size"
		referrerpolicy="no-referrer"
		@error="broken = true"
	/>
	<span
		v-else
		class="avatar avatar--letter"
		:style="{ width: `${size}px`, height: `${size}px`, fontSize: `${Math.round(size * 0.44)}px`, '--tint': tint }"
		aria-hidden="true"
	>
		{{ initial }}
	</span>
</template>

<style scoped>
.avatar {
	flex: none;
	border-radius: var(--r-pill);
	object-fit: cover;
	background: var(--surface-3);
}

.avatar--letter {
	display: inline-grid;
	place-items: center;
	background: color-mix(in srgb, var(--tint) 22%, var(--surface-2));
	color: color-mix(in srgb, var(--tint) 70%, var(--fg-hi));
	font-family: var(--font-sans);
	font-weight: 700;
	line-height: 1;
	box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--tint) 30%, transparent);
}
</style>
