<script setup lang="ts">
import { Button } from '@/components/ui/button'

const links = [
  { label: 'Documentation', href: '#docs' },
  { label: 'Projects', href: '#projects' },
  { label: 'Downloads', href: '#downloads' },
  { label: 'Team', href: '#team' },
  { label: 'Status', href: '#status' },
]
</script>

<template>
  <div class="navwrap">
    <nav class="bar">
      <a href="#" class="brand">
        <span class="brand-mark" aria-hidden="true" />
        BX Team
      </a>

      <div class="links">
        <a v-for="l in links" :key="l.href" :href="l.href">{{ l.label }}</a>
      </div>

      <div class="right">
        <Button as="a" href="#" variant="pill" size="nav">Login</Button>
      </div>
    </nav>
  </div>
</template>
