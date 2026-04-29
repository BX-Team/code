<script setup lang="ts">
import { Button } from '@/components/ui/button'
</script>

<template>
  <section class="hero">
    <h1 class="hero-h">High-performance Minecraft server software</h1>
    <p class="lede">
      BX Team builds open-source server forks, plugins, and developer tools that just work.
      Stable out of the box, easy to maintain, optimized for real production servers.
    </p>
    <div class="hero-cta">
      <Button as="a" href="#downloads" variant="default">Get started</Button>
      <Button as="a" href="#docs" variant="ghost">Read the docs</Button>
    </div>
  </section>
</template>
