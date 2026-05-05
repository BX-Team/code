<script setup lang="ts">
import { getCurrentInstance } from 'vue'

const props = withDefaults(defineProps<{ size?: number }>(), { size: 22 })

const uid = getCurrentInstance()?.uid ?? 0
const gradId = `bm-g-${uid}`
</script>

<template>
	<svg :width="props.size" :height="props.size" viewBox="0 0 22 22" fill="none" aria-hidden="true" style="flex-shrink:0;display:inline-block">
		<defs>
			<linearGradient :id="gradId" x1="22" y1="0" x2="0" y2="22" gradientUnits="userSpaceOnUse">
				<stop offset="0%"   stop-color="var(--brand)" />
				<stop offset="40%"  stop-color="var(--brand-2)" />
				<stop offset="72%"  stop-color="var(--brand)" />
				<stop offset="100%" stop-color="var(--brand-2)" />
			</linearGradient>
		</defs>
		<rect width="22" height="22" rx="6" :fill="`url(#${gradId})`" />
		<rect x="5" y="5" width="12" height="12" rx="3" fill="var(--bg-0)" />
		<rect x="8" y="8" width="6" height="6" rx="1" fill="var(--brand)" />
	</svg>
</template>
