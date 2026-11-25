<script setup lang="ts">
import { type Banner, NoticeSchema } from '@bx-team/types/schema/bxid';
import { onMounted, ref } from 'vue';
import { AUTH_BASE } from '~/lib/auth';

/** A notice from the `site-banner` flag in Flagship, such as maintenance; the site is static, so it is fetched here. */
const banner = ref<Banner | null>(null);

onMounted(async () => {
  try {
    const response = await fetch(`${AUTH_BASE}/v1/auth/notice`);
    if (response.ok) banner.value = NoticeSchema.parse(await response.json()).banner;
  } catch {
    // BX ID being down is no reason to break every page.
  }
});
</script>

<template>
	<div v-if="banner" class="site-banner" :class="`site-banner--${banner.tone}`" role="status">{{ banner.text }}</div>
</template>

<style scoped>
.site-banner {
	padding: 8px 16px;
	border-bottom: 1px solid var(--line);
	background: var(--surface-2);
	color: var(--fg-hi);
	font-size: 14px;
	line-height: 1.4;
	text-align: center;
}

.site-banner--warning {
	color: var(--warn);
}
</style>
