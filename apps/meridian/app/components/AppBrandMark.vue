<script setup lang="ts">
withDefaults(defineProps<{ size?: number }>(), { size: 22 })
</script>

<template>
  <span class="bm" :style="{ '--bm': `${size}px` }" aria-hidden="true" />
</template>

<style scoped>
.bm {
  display: inline-block;
  flex-shrink: 0;
  position: relative;
  width: var(--bm, 22px);
  height: var(--bm, 22px);
  border-radius: calc(var(--bm, 22px) * 0.273);
  background: conic-gradient(from 200deg, var(--brand), var(--brand-2), oklch(0.55 var(--accent-c) var(--accent-h)), var(--brand));
  box-shadow: 0 0 calc(var(--bm, 22px) * 0.636) color-mix(in oklab, var(--brand-soft) 60%, var(--brand-soft-2));
}
.bm::after {
  content: "";
  position: absolute;
  inset: calc(var(--bm, 22px) * 0.227);
  background: var(--bg-0);
  border-radius: calc(var(--bm, 22px) * 0.136);
}
.bm::before {
  content: "";
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: calc(var(--bm, 22px) * 0.273);
  height: calc(var(--bm, 22px) * 0.273);
  background: var(--brand);
  border-radius: calc(var(--bm, 22px) * 0.045);
  z-index: 1;
  box-shadow: 0 0 calc(var(--bm, 22px) * 0.364) var(--brand);
}
</style>
