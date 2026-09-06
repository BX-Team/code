<script setup lang="ts">
import { DIVINEMC_DEFAULTS } from '@/lib/divinemc/defaults';
import { DESCRIPTIONS } from '@/lib/divinemc/descriptions';
</script>

<template>
	<ConfigViewer :config="DIVINEMC_DEFAULTS" :comments="DESCRIPTIONS" title="DivineMC Configuration" />
</template>
