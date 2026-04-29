<script setup lang="ts">
/**
 * Shared page shell: hero atmospheric background + navbar + footer.
 * Use for every interior page so the visual identity stays consistent.
 */
</script>

<template>
  <div>
    <div class="hero-bg" aria-hidden="true">
      <div class="grid-overlay" />
    </div>
    <div class="vignette" aria-hidden="true" />

    <AppNavbar />
    <main class="page-main">
      <slot />
    </main>
    <AppFooter />
  </div>
</template>

<style scoped>
.page-main {
  position: relative;
  z-index: 2;
  min-height: 60vh;
}
</style>
