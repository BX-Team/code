<script setup lang="ts">
import { Footer, type FooterColumn } from '@bx-team/ui';
import { DISCORD_URL, GITHUB_URL } from '~/config/links';
import { PROJECTS } from '~/config/projects';

const columns: FooterColumn[] = [
  {
    title: 'Projects',
    links: PROJECTS.filter(p => !p.archived).map(p => ({ label: p.name, href: `/${p.slug}` })),
  },
  {
    title: 'Resources',
    links: [
      { label: 'Documentation', href: '/docs' },
      { label: 'Downloads', href: '/downloads' },
      { label: 'Tools', href: '/tools' },
      { label: 'API reference', href: '/docs/api' },
    ],
  },
  {
    title: 'Community',
    links: [
      { label: 'Discord', href: DISCORD_URL, external: true },
      { label: 'GitHub', href: GITHUB_URL, external: true },
      { label: 'Team', href: '/team' },
    ],
  },
];
</script>

<template>
	<Footer :columns="columns" :github-href="GITHUB_URL" :discord-href="DISCORD_URL" />
</template>
