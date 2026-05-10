<script setup lang="ts">
import { computed } from 'vue';
import { Footer, Navbar } from '@bx-team/ui';
import { DISCORD_URL } from '~/config/links';

const status = useStatusSummary();

const statusLevel = computed((): 'ok' | 'warn' | 'err' => {
  if (status.value === 'degraded') return 'err';
  if (status.value === 'maintenance') return 'warn';
  return 'ok';
});

const statusText = computed(() => {
  if (status.value === 'degraded') return 'Some systems degraded';
  if (status.value === 'maintenance') return 'Maintenance in progress';
  return 'All systems operational';
});
</script>

<template>
	<div class="shell">
		<Navbar :discord-href="DISCORD_URL" />
		<slot />
		<Footer
			:discord-href="DISCORD_URL"
			:status="statusText"
			:status-level="statusLevel"
			status-href="https://status.bxteam.org"
		/>
	</div>
</template>

<style scoped>
.shell {
	min-height: 100vh;
	display: flex;
	flex-direction: column;
}
</style>
