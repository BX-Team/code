<script setup lang="ts">
import { Button } from '@/components/ui/button'

const links = [
  { label: 'Downloads', to: '/downloads' },
  { label: 'Documentation', to: '/docs' },
  { label: 'Team', to: '/team' },
  { label: 'Status', to: 'https://status.bxteam.org' },
  { label: 'Maven', to: 'https://repo.bxteam.org' }
]
</script>

<template>
  <div class="navwrap">
    <nav class="bar">
      <NuxtLink to="/" class="brand">
        <span class="brand-mark" aria-hidden="true" />
        BX Team
      </NuxtLink>

      <div class="links">
        <NuxtLink
          v-for="l in links"
          :key="l.to"
          :to="l.to"
          :external="l.to.startsWith('http')"
          :target="l.to.startsWith('http') ? '_blank' : undefined"
          :rel="l.to.startsWith('http') ? 'noopener noreferrer' : undefined"
        >{{ l.label }}</NuxtLink>
      </div>

      <div class="right">
        <a href="https://discord.gg/bx-team" target="_blank" rel="noopener noreferrer" class="demo">Discord</a>
        <Button as-child variant="pill" size="nav">
          <NuxtLink to="/dashboard">Dashboard</NuxtLink>
        </Button>
      </div>
    </nav>
  </div>
</template>
